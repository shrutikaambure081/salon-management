/* AUTH DOMAIN — register (strong password), login, session, logout */
let session=JSON.parse(SS.getItem('salon_session')||'null');
const setSession=s=>{session=s;SS.setItem('salon_session',JSON.stringify(s))};
const showScreen=id=>document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));
const authError=m=>{$('authMsg').textContent=m};
document.querySelector('.tabs').addEventListener('click',e=>{const b=e.target.closest('.tab-btn');if(!b)return;
  document.querySelectorAll('.tab-btn').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===b.dataset.tab));authError('')});
$('showPw').addEventListener('change',e=>document.querySelectorAll('input.pw').forEach(i=>{i.type=e.target.checked?'text':'password'}));
const PW_RULE=/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
$('registerForm').addEventListener('submit',e=>{e.preventDefault();
  const name=$('regName').value.trim().replace(/\s+/g,' '),mobile=$('regMobile').value.trim(),email=$('regEmail').value.trim(),pw=$('regPass').value;
  if(!/^[A-Za-z ]+$/.test(name))return authError('Name must contain letters only (no numbers or symbols).');
  if(!/^\d{10}$/.test(mobile))return authError('Mobile number must be exactly 10 digits.');
  if(!/^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(email))return authError('Email must end with @gmail.com');
  if(!PW_RULE.test(pw))return authError('Password needs 8+ characters with letters, numbers and symbols (example: Salon@123).');
  const cs=db('customers');if(cs.some(c=>c.mobile===mobile))return authError('Mobile already registered. Please login.');
  const c={id:uid('cu'),name,mobile,email,pass:pwHash(pw)};cs.push(c);put('customers',cs);LS.setItem('salon_remember',JSON.stringify({id:mobile,pw}));e.target.reset();toast('Registered successfully!');loginCustomer(c)});
$('loginForm').addEventListener('submit',e=>{e.preventDefault();
  const v=$('loginId').value.trim(),pw=$('loginPass').value,cs=db('customers');
  let m=cs.filter(c=>c.mobile===v);if(!m.length)m=cs.filter(c=>c.email.toLowerCase()===v.toLowerCase());if(!m.length)m=cs.filter(c=>c.name.toLowerCase()===v.toLowerCase());
  if(!m.length)return authError('No account found. Please register.');
  if(m.length>1)return authError('Several accounts share that name — login with your mobile number.');
  if(m[0].pass!==pwHash(pw))return authError('Wrong password.');
  if($('remember').checked)LS.setItem('salon_remember',JSON.stringify({id:v,pw}));else LS.removeItem('salon_remember');
  e.target.reset();loginCustomer(m[0])});
$('adminForm').addEventListener('submit',e=>{e.preventDefault();const a=load(K.admin,{});
  if($('adminUser').value.trim()===a.username&&$('adminPass').value===a.password){e.target.reset();setSession({role:'admin'});showScreen('adminScreen');renderAdmin()}else authError('Invalid admin credentials.')});
function loginCustomer(c){setSession({role:'customer',customerId:c.id});authError('');showScreen('customerScreen');renderCustomer()}
function logout(){session=null;SS.removeItem('salon_session');showScreen('welcomeScreen');resetWelcome();authError('');prefillLogin();
  document.querySelectorAll('.tab-btn').forEach((x,i)=>x.classList.toggle('active',i===0));document.querySelectorAll('.tab-panel').forEach((p,i)=>p.classList.toggle('active',i===0))}
$('custLogoutBtn').addEventListener('click',logout);$('adminLogoutBtn').addEventListener('click',logout);

function prefillLogin(){try{const r=JSON.parse(LS.getItem('salon_remember')||'null');if(r){$('loginId').value=r.id;$('loginPass').value=r.pw;$('remember').checked=true}}catch(e){}}
prefillLogin();
