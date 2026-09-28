/* APP DOMAIN — navigation, availability controls, live refresh, startup */
function bindNav(sel,attr,prefix,cls){document.querySelector(sel).addEventListener('click',e=>{const b=e.target.closest('.nav-btn');if(!b)return;
  document.querySelectorAll(sel+' .nav-btn').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.'+cls).forEach(v=>v.classList.toggle('active',v.id===prefix+b.dataset[attr]));refreshAll()})}
bindNav('#customerScreen .admin-nav','cview','cview-','cust-view');bindNav('#adminScreen .admin-nav','view','view-','admin-view');
['pub','cs','as'].forEach(p=>{$(p+'Dur').innerHTML=[15,30,45,60,90,120,150,180].map(m=>`<option value="${m}"${m===30?' selected':''}>${m} min</option>`).join('');
  const d=$(p+'Date');d.value=today();if(p!=='as'){d.min=today();d.max=addDays(30)}
  d.addEventListener('change',()=>renderAvail(p));$(p+'Dur').addEventListener('change',()=>renderAvail(p))});
$('pubBtn').addEventListener('click',()=>{$('pubModal').classList.add('open');renderAvail('pub')});
$('pubClose').addEventListener('click',()=>$('pubModal').classList.remove('open'));
$('pubModal').addEventListener('click',e=>{if(e.target.id==='pubModal')e.target.classList.remove('open')});
function refreshAll(){if($('pubModal').classList.contains('open'))renderAvail('pub');if(!session)return;session.role==='customer'?renderCustomer():renderAdmin()}
setInterval(()=>{const a=document.activeElement;if(a&&a.closest&&a.closest('table')&&/INPUT|SELECT/.test(a.tagName))return;refreshAll()},5000);
addEventListener('DOMContentLoaded',()=>{if(session&&session.role==='customer'&&me()){showScreen('customerScreen');renderCustomer()}else if(session&&session.role==='admin'){showScreen('adminScreen');renderAdmin()}else{session=null;showScreen('welcomeScreen');resetWelcome()}});
