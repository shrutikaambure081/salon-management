/* DATA DOMAIN — safe storage, seed data, helpers */
function mkStore(kind){try{const s=window[kind];s.setItem('__t','1');s.removeItem('__t');return s}catch(e){const m={};return{getItem:k=>(k in m?m[k]:null),setItem:(k,v)=>{m[k]=String(v)},removeItem:k=>{delete m[k]}}}}
const LS=mkStore('localStorage'),SS=mkStore('sessionStorage');
const K={customers:'salon2_customers',bookings:'salon2_bookings',seats:'salon3_seats',services:'salon3_services',staff:'salon3_staff',seq:'salon2_seq',admin:'salon2_admin'};
const OPEN=540,CLOSE=1260,STEP=15; // salon hours 9:00 AM - 9:00 PM, 15-min slot grid
const $=id=>document.getElementById(id);
const load=(k,f)=>{const r=LS.getItem(k);return r?JSON.parse(r):f};
const save=(k,d)=>LS.setItem(k,JSON.stringify(d));
const db=n=>load(K[n],[]);
const put=(n,d)=>save(K[n],d);
const CATALOG={'Hairstyle':[['Layer Cut',300,45,'💇‍♀️'],['Bob Cut',350,45,'👩‍🦰'],['Step Cut',300,45,'✂️'],['Pixie Cut',400,45,'💇'],['Blow Dry',250,30,'💨'],['Curls & Waves',500,60,'🌊'],['Fade Cut',200,30,'💈'],['Crew Cut',150,25,'🧑'],['Undercut',250,30,'⚡'],['Pompadour',300,40,'🕺'],['Beard Styling',150,20,'🧔'],['Kids Haircut',120,20,'🧒']],
'Facial':[['Fruit Facial',400,45,'🍓'],['Gold Facial',900,60,'🥇'],['Diamond Facial',1200,60,'💎'],['Charcoal Detox',600,45,'🖤'],['Anti-Tan Facial',500,45,'☀️'],['Hydra Glow',1500,75,'💧'],["Men's Clean-up",350,30,'🧖‍♂️']],
'Hair Colour':[['Global Colour',1500,90,'🎨'],['Highlights',2000,120,'✨'],['Root Touch-up',700,45,'🖌️'],['Balayage',3000,150,'🌈']],
'Beauty & Care':[['Hair Wash',80,15,'🚿'],['Head Massage',180,30,'💆'],['Eyebrow Threading',60,15,'👁️'],['Manicure',250,45,'💅'],['Pedicure',300,60,'🦶'],['Waxing',220,30,'🪒'],['Bridal Makeup',1500,120,'👰']]};
function seed(){
  if(!LS.getItem(K.admin))save(K.admin,{username:'admin',password:'admin123'});
  if(!LS.getItem(K.services)){let n=0;put('services',Object.entries(CATALOG).flatMap(([cat,l])=>l.map(a=>({id:'s'+(++n),name:a[0],price:a[1],dur:a[2],icon:a[3],cat}))))}
  if(!LS.getItem(K.seats))put('seats',Array.from({length:10},(_,i)=>({id:'c'+(i+1),name:'Seat '+(i+1),blocked:false})));
  if(!LS.getItem(K.staff))put('staff',[['Priya','F'],['Anjali','F'],['Sneha','F'],['Pooja','F'],['Kavya','F'],['Ravi','M'],['Amit','M'],['Rahul','M'],['Sagar','M'],['Vikas','M']].map((a,i)=>({id:'st'+(i+1),name:a[0],g:a[1],available:true})));
  ['customers','bookings'].forEach(n=>{if(!LS.getItem(K[n]))put(n,[])});
  if(!LS.getItem(K.seq))save(K.seq,0);
}
seed();
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>ymd(new Date());
const addDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return ymd(d)};
const nowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
const fmt=m=>((Math.floor(m/60)%12)||12)+':'+pad(m%60)+' '+(m<720?'AM':'PM');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function pwHash(s){s='salon|'+s;let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return(4294967296*(2097151&h2)+(h1>>>0)).toString(36)}
function nextToken(){const n=load(K.seq,0)+1;save(K.seq,n);return'T'+String(n).padStart(3,'0')}
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('show'),2600)}
