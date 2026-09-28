/* SCHEDULE DOMAIN — seats, service timings, booking engine, public availability */
const activeOn=d=>db('bookings').filter(b=>b.date===d&&(b.status==='booked'||b.status==='serving'));
const effEnd=b=>(b.status==='serving'&&b.date===today())?Math.max(b.end,nowMin()):b.end;
const staffFree=(id,d,st,en)=>!activeOn(d).some(b=>b.staffId===id&&b.start<en&&st<b.end);
const usableSeats=()=>db('seats').filter(s=>!s.blocked);
const seatBusy=(id,d,st,en)=>activeOn(d).some(b=>b.seatId===id&&b.start<en&&st<effEnd(b));
const freeSeats=(d,st,en)=>usableSeats().filter(s=>!seatBusy(s.id,d,st,en));
const seatName=id=>(db('seats').find(s=>s.id===id)||{name:'-'}).name;
const staffName=id=>(db('staff').find(s=>s.id===id)||{name:'Next free stylist'}).name;
const svcNames=b=>b.items.map(i=>i.name).join(', ');
const queueToday=()=>activeOn(today()).filter(b=>b.status==='booked').sort((a,b)=>a.priority-b.priority);
function pickStaff(d,st,en){const bs=activeOn(d),cnt=s=>bs.filter(b=>b.staffId===s.id).length;
  return db('staff').filter(s=>s.available&&!bs.some(b=>b.staffId===s.id&&b.start<en&&st<b.end)).sort((a,b)=>cnt(a)-cnt(b))[0]||null}
function slotsFor(d,dur){const out=[];let t=OPEN;if(d===today())t=Math.max(OPEN,Math.ceil(nowMin()/STEP)*STEP);
  for(;t+dur<=CLOSE;t+=STEP)out.push({t,left:freeSeats(d,t,t+dur).length});return out}
function summarize(ids){const sv=db('services'),it=ids.map(i=>sv.find(s=>s.id===i)).filter(Boolean);
  return{items:it.map(s=>({name:s.name,price:s.price,dur:s.dur})),price:it.reduce((a,s)=>a+s.price,0),dur:it.reduce((a,s)=>a+s.dur,0)}}
function createBooking(c,ids,date,start,pay,seatId,staffId){
  if(!ids.length)return{err:'Select at least one service.'};
  if(start==null)return{err:'Pick a time slot.'};
  if(!pay)return{err:'Choose a payment option: QR code or Cash.'};
  const sm=summarize(ids),end=start+sm.dur;
  if(date===today()&&start<nowMin()-10)return{err:'That time has already passed. Pick another slot.'};
  if(end>CLOSE)return{err:'Salon closes at '+fmt(CLOSE)+'.'};
  if(activeOn(date).some(b=>b.customerId===c.id&&b.start<end&&start<b.end))return{err:'You already have a booking at that time.'};
  const seat=seatId?freeSeats(date,start,end).find(s=>s.id===seatId):freeSeats(date,start,end)[0];if(!seat)return{err:'No seat is free at that time. Pick another slot.'};
  if(staffId&&!staffFree(staffId,date,start,end))return{err:'That stylist is busy at that time. Pick another.'};
  const st=staffId?db('staff').find(s=>s.id===staffId):pickStaff(date,start,end),token=nextToken(),bs=db('bookings');
  const b={id:uid('b'),token,customerId:c.id,name:c.name,mobile:c.mobile,items:sm.items,price:sm.price,dur:sm.dur,date,start,end,seatId:seat.id,staffId:st?st.id:null,status:'booked',priority:start*1000+(parseInt(token.slice(1))%1000),payMethod:pay,payStatus:'Pending',created:Date.now()};
  bs.push(b);put('bookings',bs);return{b}}
function cancelB(id){const bs=db('bookings'),b=bs.find(x=>x.id===id);if(!b||b.status!=='booked')return;
  if(b.payStatus==='Paid'&&!confirm(T('Cancel this paid booking? The amount will be refunded to the customer.')))return;
  b.status='cancelled';b.cancelledOn=today();
  if(b.payStatus==='Paid'){b.refund='Pending';b.refundAmt=b.price;toast('Booking cancelled — refund of ₹'+b.price+' will be returned to you.')}else toast('Booking cancelled — seat released.');
  put('bookings',bs);refreshAll()}
function seatState(s){const bs=db('bookings').filter(b=>b.seatId===s.id&&b.date===today()),sv=bs.find(b=>b.status==='serving');
  if(sv)return{c:'red',l:'Booked',t:sv.token};if(s.blocked)return{c:'red',l:'Blocked'};
  const nx=bs.filter(b=>b.status==='booked'&&b.start<=nowMin()+30&&b.end>nowMin()).sort((a,b)=>a.start-b.start)[0];
  return nx?{c:'red',l:'Booked',t:nx.token}:{c:'green',l:'Available'}}
function seatGridHTML(admin){return'<div class="chair-grid">'+db('seats').map(s=>{const st=seatState(s);return`<div class="chair ${st.c}" ${admin?`onclick="toggleBlock('${s.id}')"`:''}>${esc(s.name)}<small>${T(st.l)}${st.t?'<br>'+st.t:''}</small></div>`}).join('')+'</div>'}
function slotGridHTML(d,dur,pick){const sl=slotsFor(d,dur),tot=usableSeats().length;
  if(!sl.length)return'<p class="muted">No more time slots left on this day.</p>';
  return'<div class="slot-grid">'+sl.map(s=>{const c=s.left===0?'red':'green',txt=`${fmt(s.t)}<small>${s.left?s.left+' '+T('seats left'):T('Booked')}</small>`;
    return pick&&s.left?`<button type="button" class="slot ${c}${pick.sel===s.t?' sel':''}" onclick="${pick.fn}(${s.t})">${txt}</button>`:`<div class="slot ${c}">${txt}</div>`}).join('')+'</div>'}
function timelineHTML(d,admin){const bs=db('bookings').filter(b=>b.date===d&&b.status!=='cancelled');
  return db('seats').map(s=>{const l=bs.filter(b=>b.seatId===s.id).sort((a,b)=>a.start-b.start);
    return`<div class="seat-row"><b>${esc(s.name)}${s.blocked?' 🔒':''}</b><div>`+(l.length?l.map(b=>`<span class="chip ${b.status}">${fmt(b.start)}–${fmt(b.end)} · ${esc(svcNames(b))} · ${b.token}${admin?' · '+esc(b.name):''}</span>`).join(''):'<span class="muted">Free all day</span>')+'</div></div>'}).join('')}
function availabilityHTML(d,dur,admin){const n=db('seats').length,u=usableSeats().length,now=d===today()?` · free right now: <b>${freeSeats(d,nowMin(),nowMin()+1).length}</b>`:'';
  return`<p class="muted">Open ${fmt(OPEN)}–${fmt(CLOSE)} · Total seats: <b>${n}</b> · usable: <b>${u}</b>${now}. Slots are for a <b>${dur}-minute</b> service.</p>`+slotGridHTML(d,dur)+'<h4 style="margin:12px 0 4px">Bookings by seat (one after another)</h4>'+timelineHTML(d,admin)}
function renderAvail(p){const o=$(p+'Out');if(o)o.innerHTML=availabilityHTML($(p+'Date').value||today(),+$(p+'Dur').value||30,p==='as')}
const bookingCard=b=>`<div class="bcard"><b>Token ${b.token}</b> <span class="badge ${b.status}">${b.status}</span><br>${esc(svcNames(b))}<br>📅 ${b.date} · ⏰ ${fmt(b.start)}–${fmt(b.end)} (${b.dur} min)<br>🪑 ${esc(seatName(b.seatId))} · 💇 ${esc(staffName(b.staffId))}<br>₹${b.price} · ${b.payMethod==='qr'?'QR code':'Cash'} · <span class="badge ${b.payStatus}">${b.payStatus}</span></div>`;
