/* PAYMENT DOMAIN — QR code or cash */
function payBox(b){const qr=b.payMethod==='qr';
  return`<div class="paycard"><div><b>${b.token}</b> · ${esc(svcNames(b))}<br><span class="muted">${b.date} ${fmt(b.start)} · Amount ₹${b.price}</span></div>
  <div class="pay-methods"><button class="btn ${qr?'primary':''}" onclick="setPay('${b.id}','qr')">📱 Pay by QR code</button><button class="btn ${qr?'':'ok'}" onclick="setPay('${b.id}','cash')">💵 Pay by Cash</button></div>`+
  (qr?`<div class="qr-wrap"><img src="${PAYMENT_QR_SRC}" alt="Scan to pay"><p class="muted">Scan with any UPI app and pay ₹${b.price}</p><button class="btn small ok" onclick="selfPaid('${b.id}')">I've paid</button></div>`:`<p class="muted">Pay ₹${b.price} in cash at the counter. The owner will confirm it.</p>`)+'</div>'}
function patchB(id,fn){const bs=db('bookings'),b=bs.find(x=>x.id===id);if(b){fn(b);put('bookings',bs);refreshAll()}}
const setPay=(id,m)=>patchB(id,b=>{b.payMethod=m});
const selfPaid=id=>patchB(id,b=>{b.payStatus='Paid';b.selfReported=true;b.paidOn=today();toast('Payment noted — the owner will confirm it.')});
const markPaid=id=>patchB(id,b=>{b.payStatus='Paid';b.verified=true;b.paidOn=b.paidOn||today();toast('Payment confirmed.')});
const markRefunded=id=>patchB(id,b=>{b.refund='Refunded';b.refundedOn=today();toast('Refund marked as returned to the customer.')});
