/* ADMIN DOMAIN — overview, bookings, schedule, seats, services, staff, customers, reports */
const ab=(c,l,f,id,a)=>`<button class="btn small ${c}" onclick="${f}('${id}'${a!==undefined?','+a:''})">${l}</button>`;
const sumP=l=>l.reduce((a,b)=>a+b.price,0);
function renderAdmin(){renderOverview();renderBookings();renderAvail('as');$('adSeats').innerHTML=seatGridHTML(true);renderServices();renderStaff();renderCustomers();renderReports()}
function renderOverview(){const all=db('bookings'),t=today(),live=all.filter(b=>b.status!=='cancelled'),q=queueToday(),sv=all.filter(b=>b.status==='serving'),pend=live.filter(b=>b.payStatus==='Pending'),n=db('seats').length;
  $('stCust').textContent=db('customers').length;$('stWait').textContent=q.length;$('stFree').textContent=freeSeats(t,nowMin(),nowMin()+1).length;$('stFreeOf').textContent='Seats Free Now (of '+n+')';
  $('stOcc').textContent=sv.length;$('stRev').textContent='₹'+sumP(live.filter(b=>b.payStatus==='Paid'&&b.paidOn===t));$('stPend').textContent='₹'+sumP(pend);
  const it=b=>`<div class="status-item"><span>${esc(b.name)} (${esc(svcNames(b))})</span><b>${b.token}</b></div>`;
  $('bdWait').innerHTML=q.map(b=>it(b).replace('</b>',' · '+fmt(b.start)+'</b>')).join('')||'<p class="muted">No one waiting.</p>';
  $('bdServe').innerHTML=sv.map(b=>it(b).replace('</b>',' · '+esc(seatName(b.seatId))+'</b>')).join('')||'<p class="muted">No one being served.</p>';
  $('bdPend').innerHTML=pend.map(b=>`<div class="status-item"><span>${esc(b.name)} — ${b.token}</span><b>₹${b.price}</b></div>`).join('')||'<p class="muted">No pending payments.</p>';
  $('ovSeats').innerHTML=seatGridHTML(false)}
function acts(b,qt){let h='';
  if(b.status==='booked'){if(b.date===today()){h+=ab('ok','Start','startB',b.id);const i=qt.findIndex(x=>x.id===b.id);if(i>0)h+=ab('warn','↑','moveB',b.id,-1);if(i>=0&&i<qt.length-1)h+=ab('warn','↓','moveB',b.id,1)}h+=ab('danger','Cancel','cancelB',b.id)}
  if(b.status==='serving')h+=ab('primary','Complete','completeB',b.id);
  if(b.refund==='Pending')h+=ab('warn','Mark Refunded','markRefunded',b.id);
  if(b.status!=='cancelled'){if(b.payStatus==='Pending')h+=ab('ok','Mark Paid','markPaid',b.id);else if(b.selfReported&&!b.verified)h+=ab('','Confirm payment','markPaid',b.id)}
  return h}
const payBadge=b=>`<span class="badge ${b.payStatus}">${b.payStatus}${b.selfReported&&!b.verified?' (customer-reported)':''}</span>`;
function renderBookings(){const q=$('bkSearch').value.toLowerCase(),sf=$('bkStatus').value,pf=$('bkPay').value,sc=$('bkScope').value,t=today(),qt=queueToday();
  const rows=db('bookings').filter(b=>(sc==='all'||b.date===t)&&(!sf||b.status===sf)&&(!pf||b.payStatus===pf)&&(!q||b.name.toLowerCase().includes(q)||b.mobile.includes(q)||b.token.toLowerCase().includes(q))).sort((a,b)=>a.date.localeCompare(b.date)||a.priority-b.priority);
  $('bkBody').innerHTML=rows.map(b=>`<tr><td>${b.token}</td><td>${esc(b.name)}<br><small>${b.mobile}</small></td><td>${b.date}<br><small>${fmt(b.start)}–${fmt(b.end)}</small></td><td>${esc(svcNames(b))}<br><small>₹${b.price} · ${b.dur} min</small></td><td>${esc(seatName(b.seatId))}<br><small>${esc(staffName(b.staffId))}</small></td><td><span class="badge ${b.status}">${b.status}</span></td><td>${b.payMethod==='qr'?'QR':'Cash'}<br>${payBadge(b)}${b.refund?`<br><small>Refund ₹${b.refundAmt}</small> <span class="badge ${b.refund}">${b.refund}</span>`:''}</td><td>${acts(b,qt)}</td></tr>`).join('')||'<tr><td colspan="8" class="muted">No bookings found.</td></tr>'}
['bkSearch','bkStatus','bkPay','bkScope'].forEach(i=>$(i).addEventListener('input',renderBookings));
function startB(id){const bs=db('bookings'),b=bs.find(x=>x.id===id);if(!b||b.date!==today())return toast("Only today's bookings can be started.");
  const busy=s=>bs.some(x=>x.status==='serving'&&x.seatId===s);
  if(busy(b.seatId)){const alt=usableSeats().find(s=>!busy(s.id));if(!alt)return toast('No free seat right now.');b.seatId=alt.id}
  b.status='serving';b.startedAt=Date.now();put('bookings',bs);toast(b.name+' is now being served.');refreshAll()}
const completeB=id=>patchB(id,b=>{b.status='completed';b.doneAt=Date.now();toast('Service completed — seat is free for the next customer.')});
function moveB(id,dir){const q=queueToday(),i=q.findIndex(x=>x.id===id),j=i+dir;if(i<0||j<0||j>=q.length)return;
  const bs=db('bookings'),a=bs.find(x=>x.id===q[i].id),b=bs.find(x=>x.id===q[j].id);[a.priority,b.priority]=[b.priority,a.priority];put('bookings',bs);refreshAll()}
function toggleBlock(id){const ss=db('seats'),s=ss.find(x=>x.id===id),bs=db('bookings').filter(b=>b.seatId===id&&(b.status==='serving'||(b.status==='booked'&&b.date>=today())));
  if(bs.length)return toast('This seat has current or upcoming bookings.');s.blocked=!s.blocked;put('seats',ss);toast(s.name+(s.blocked?' blocked':' unblocked'));refreshAll()}
$('addChairBtn').addEventListener('click',()=>{const ss=db('seats'),n=Math.max(0,...ss.map(s=>parseInt(s.name.replace(/\D/g,''))||0))+1;ss.push({id:uid('c'),name:'Seat '+n,blocked:false});put('seats',ss);toast('Seat added — total '+ss.length);refreshAll()});
$('delChairBtn').addEventListener('click',()=>{const ss=db('seats');if(ss.length<=1)return toast('Keep at least one seat.');const s=ss[ss.length-1];
  if(db('bookings').some(b=>b.seatId===s.id&&(b.status==='serving'||(b.status==='booked'&&b.date>=today()))))return toast(s.name+' has current or upcoming bookings.');ss.pop();put('seats',ss);toast('Seat removed — total '+ss.length);refreshAll()});
function renderServices(){$('svBody').innerHTML=db('services').map(s=>`<tr><td>${esc(s.icon||'✂️')}</td><td>${esc(s.name)}</td><td><input class="sm" type="number" min="1" value="${s.price}" onchange="editSvc('${s.id}','price',this.value)"></td><td><input class="sm" type="number" min="5" step="5" value="${s.dur}" onchange="editSvc('${s.id}','dur',this.value)"> min</td><td>${ab('danger','Delete','delSvc',s.id)}</td></tr>`).join('')}
function editSvc(id,f,v){v=+v;if(!(v>0))return toast('Enter a valid number.');const sv=db('services');sv.find(s=>s.id===id)[f]=v;put('services',sv);toast('Updated.')}
const delSvc=id=>{put('services',db('services').filter(s=>s.id!==id));refreshAll()};
$('svForm').addEventListener('submit',e=>{e.preventDefault();const sv=db('services'),p=+$('svPrice').value,d=+$('svDur').value;if(!(p>0&&d>0))return toast('Price and time must be positive.');
  sv.push({id:uid('s'),name:$('svName').value.trim(),price:p,dur:d,icon:$('svIcon').value.trim()||'✂️'});put('services',sv);e.target.reset();refreshAll()});
function renderStaff(){$('stBody').innerHTML=db('staff').map(s=>`<tr><td>${s.g==='F'?'👩':'👨'} ${esc(s.name)}</td><td>${s.available?'Available':'Busy / off'}</td><td>${ab('warn','Toggle','togStaff',s.id)} ${ab('danger','Delete','delStaff',s.id)}</td></tr>`).join('')}
const togStaff=id=>{const st=db('staff');const s=st.find(x=>x.id===id);s.available=!s.available;put('staff',st);refreshAll()};
const delStaff=id=>{put('staff',db('staff').filter(s=>s.id!==id));refreshAll()};
$('stForm').addEventListener('submit',e=>{e.preventDefault();const st=db('staff');st.push({id:uid('st'),name:$('stName').value.trim(),g:$('stGender').value,available:true});put('staff',st);e.target.reset();refreshAll()});
function renderCustomers(){const f=$('cuSearch').value.toLowerCase(),bs=db('bookings').filter(b=>b.status!=='cancelled');
  $('cuBody').innerHTML=db('customers').filter(c=>!f||c.name.toLowerCase().includes(f)||c.mobile.includes(f)||c.email.toLowerCase().includes(f)).map(c=>{const m=bs.filter(b=>b.customerId===c.id);return`<tr><td>${esc(c.name)}</td><td>${c.mobile}</td><td>${esc(c.email)}</td><td>${m.length}</td><td>₹${sumP(m.filter(b=>b.payStatus==='Paid'))}</td></tr>`}).join('')||'<tr><td colspan="5" class="muted">No customers yet.</td></tr>'}
$('cuSearch').addEventListener('input',renderCustomers);
function renderReports(){const t=today(),bs=db('bookings').filter(b=>b.status!=='cancelled'),paidT=bs.filter(b=>b.payStatus==='Paid'&&b.paidOn===t),map={};
  $('rpPaid').textContent='₹'+sumP(paidT);$('rpRef').textContent='₹'+sumP(db('bookings').filter(b=>b.refund==='Pending'));$('rpPend').textContent='₹'+sumP(bs.filter(b=>b.payStatus==='Pending'&&b.date===t));$('rpAll').textContent='₹'+sumP(bs.filter(b=>b.payStatus==='Paid'));
  paidT.forEach(b=>b.items.forEach(i=>{const m=map[i.name]||(map[i.name]={n:0,r:0});m.n++;m.r+=i.price}));
  $('rpSvc').innerHTML=Object.entries(map).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v.n}</td><td>₹${v.r}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">No revenue today.</td></tr>';
  $('rpBody').innerHTML=bs.slice().sort((a,b)=>b.created-a.created).map(b=>`<tr><td>${b.token}</td><td>${esc(b.name)}</td><td>${esc(svcNames(b))}</td><td>₹${b.price}</td><td>${b.payMethod==='qr'?'QR':'Cash'}</td><td>${payBadge(b)}</td><td>${b.date}</td><td>${b.payStatus==='Pending'?ab('ok','Mark Paid','markPaid',b.id):b.selfReported&&!b.verified?ab('','Confirm','markPaid',b.id):''}</td></tr>`).join('')||'<tr><td colspan="8" class="muted">No payments yet.</td></tr>'}
