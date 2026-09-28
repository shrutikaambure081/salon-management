/* CUSTOMER DOMAIN — home, book, seats, payment, history */
let sel=new Set(),bDate=today(),bStart=null,lastBooked=null,bSeat=null,bStaff=null,bCat='Hairstyle';const notified=new Set();
const me=()=>db('customers').find(c=>c.id===(session&&session.customerId));
{const d=$('bookDate');d.value=bDate;d.min=today();d.max=addDays(30);d.addEventListener('change',()=>{bDate=d.value||today();bStart=bSeat=bStaff=null;drawBook()})}
function toggleSvc(id){sel.has(id)?sel.delete(id):sel.add(id);bStart=bSeat=bStaff=null;drawBook()}
function pickSlot(t){bStart=t;bSeat=bStaff=null;drawBook()}
const CATS=['Hairstyle','Facial','Hair Colour','Beauty & Care'];
const setCat=c=>{bCat=c;drawBook()},pickStaffB=id=>{bStaff=bStaff===id?null:id;drawBook()},pickSeatB=id=>{bSeat=bSeat===id?null:id;drawBook()};
function drawPick(sm){const none=`<p class="muted">${T('Pick a time first')}</p>`;
  if(bStart==null||!sel.size){$('staffGrid').innerHTML=none;$('seatPick').innerHTML=none;return}
  const en=bStart+sm.dur;
  $('staffGrid').innerHTML=db('staff').map(s=>{const ok=s.available&&staffFree(s.id,bDate,bStart,en);return`<div class="staff ${ok?'green':'red'}${bStaff===s.id?' sel':''}" ${ok?`onclick="pickStaffB('${s.id}')"`:''}><span>${s.g==='F'?'👩':'👨'}</span>${esc(s.name)}<small>${T(s.g==='F'?'Female':'Male')} · ${T(ok?'Available':'Booked')}</small></div>`}).join('');
  $('seatPick').innerHTML='<div class="chair-grid">'+db('seats').map(s=>{const ok=!s.blocked&&!seatBusy(s.id,bDate,bStart,en);return`<div class="chair ${ok?'green':'red'}${bSeat===s.id?' sel':''}" ${ok?`onclick="pickSeatB('${s.id}')"`:''}>${esc(s.name)}<small>${T(ok?'Available':(s.blocked?'Blocked':'Booked'))}</small></div>`}).join('')+'</div>'}
$('nextSlotBtn').addEventListener('click',()=>{if(!sel.size)return toast('Select a service first.');
  const s=slotsFor(bDate,summarize([...sel]).dur).find(x=>x.left>0);if(!s)return toast('No free time on this date — try another date.');bStart=s.t;bSeat=bStaff=null;drawBook()});
$('confirmBtn').addEventListener('click',()=>{const pay=(document.querySelector('input[name=payopt]:checked')||{}).value;
  const r=createBooking(me(),[...sel],bDate,bStart,pay,bSeat,bStaff);if(r.err)return toast(r.err);
  lastBooked=r.b.id;sel.clear();bStart=bSeat=bStaff=null;document.querySelectorAll('input[name=payopt]').forEach(x=>{x.checked=false});
  toast('Booked! Token '+r.b.token);renderCustomer()});
function drawBook(){const sv=db('services'),sm=summarize([...sel]);
  $('catTabs').innerHTML=CATS.map(c=>`<button type="button" class="btn small ${c===bCat?'primary':''}" onclick="setCat('${c}')">${T(c)}</button>`).join('');
  $('svcGrid').innerHTML=sv.filter(s=>(s.cat||'Beauty & Care')===bCat).map(s=>`<div class="service-tile ${sel.has(s.id)?'selected':''}" onclick="toggleSvc('${s.id}')"><span class="icon">${s.icon||'✂️'}</span><div class="name">${esc(s.name)}</div><div class="price">₹${s.price} · ${s.dur} min</div></div>`).join('');
  $('bookSummary').innerHTML=sel.size?`Total: <b>₹${sm.price}</b> · Time needed: <b>${sm.dur} min</b>`+(bStart!=null?` · Your slot: <b>${fmt(bStart)}–${fmt(bStart+sm.dur)}</b>`:''):'Select one or more services — each has its own time.';
  $('slotGrid').innerHTML=sel.size?slotGridHTML(bDate,sm.dur,{fn:'pickSlot',sel:bStart}):'<p class="muted">Choose a service to see available times.</p>';drawPick(sm)}
function drawResult(){const el=$('bookResult'),b=lastBooked&&db('bookings').find(x=>x.id===lastBooked);
  if(!b){el.style.display='none';return}el.style.display='block';
  el.innerHTML='<h3>✅ Booking confirmed</h3>'+bookingCard(b)+(b.status==='cancelled'?'':b.payStatus==='Paid'?'<div class="banner ok">Payment received ✅</div>':payBox(b))}
function renderHome(c){const t=today(),q=queueToday(),sv=db('bookings').filter(b=>b.status==='serving');
  $('liveQueue').innerHTML=`Now serving: <b>${sv.map(b=>b.token).join(', ')||'—'}</b><br>Up next: <b>${q.slice(0,5).map(b=>b.token).join(', ')||'—'}</b>`;
  const mine=db('bookings').filter(b=>b.customerId===c.id&&(b.status==='booked'||b.status==='serving')).sort((a,b)=>a.date.localeCompare(b.date)||a.start-b.start);
  let h=db('bookings').filter(b=>b.customerId===c.id&&b.refund==='Pending').map(b=>`<div class="banner warn">↩️ <b>Refund pending</b>: ₹${b.refundAmt} · ${b.token}<br><small>${b.payMethod==='qr'?'It will be returned by QR/UPI payment.':'It will be returned in cash at the counter.'}</small></div>`).join('');
  mine.forEach(b=>{if(b.date!==t)return;
    if(b.status==='serving')h+=`<div class="banner ok">✂️ You are being served now at ${esc(seatName(b.seatId))}.</div>`;
    else{const d=b.start-nowMin();if(d<=30){h+=`<div class="banner warn">⏰ Your turn is approaching! ${d>0?'Starts in '+d+' min':'It is your time now'} (${fmt(b.start)}) — ${esc(seatName(b.seatId))}.</div>`;
      if(!notified.has(b.id)){notified.add(b.id);toast('⏰ Your turn is approaching — token '+b.token)}}}});
  h+=mine.length?mine.map(b=>{let x='';if(b.status==='booked'&&b.date===t){const i=q.findIndex(y=>y.id===b.id);x=`<div class="muted">Queue position: <b>${i+1}</b> of ${q.length} · people ahead: ${i} · est. wait ~${Math.max(0,b.start-nowMin())} min</div>`}
    return bookingCard(b)+x+(b.status==='booked'?`<button class="btn small danger" onclick="cancelB('${b.id}')">Cancel booking</button>`:'')}).join('<hr style="border:0;border-top:1px solid #eee;margin:10px 0">'):'<p class="muted">No upcoming bookings. Go to “Book” to reserve your time.</p>';
  $('custBookings').innerHTML=h}
function renderCustomer(){const c=me();if(!c){logout();return}$('custName').textContent=c.name;renderHome(c);drawBook();drawResult();renderAvail('cs');$('csSeats').innerHTML=seatGridHTML(false);
  const pend=db('bookings').filter(b=>b.customerId===c.id&&b.status!=='cancelled'&&b.payStatus==='Pending');
  $('custPay').innerHTML=pend.length?pend.map(payBox).join(''):'<p class="muted">No pending payments.</p>';
  $('custHistoryBody').innerHTML=db('bookings').filter(b=>b.customerId===c.id).sort((a,b)=>b.created-a.created).map(b=>`<tr><td>${b.token}</td><td>${b.date}<br><small>${fmt(b.start)}–${fmt(b.end)}</small></td><td>${esc(svcNames(b))}</td><td>${esc(seatName(b.seatId))}</td><td>₹${b.price}</td><td>${b.payMethod==='qr'?'QR':'Cash'}</td><td><span class="badge ${b.payStatus}">${b.payStatus}</span>${b.refund?`<br><small>Refund ₹${b.refundAmt}</small> <span class="badge ${b.refund}">${b.refund}</span>`:''}</td><td><span class="badge ${b.status}">${b.status}</span></td></tr>`).join('')||'<tr><td colspan="8" class="muted">No visits yet.</td></tr>'}
