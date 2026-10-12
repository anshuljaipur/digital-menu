(function () {
'use strict';
var $ = function (s) { return document.querySelector(s); };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var rs = function (n) { return '\u20B9' + (Math.round(n * 100) / 100).toLocaleString('en-IN'); };
function store(area) {
  return {
    get: function (k, d) { try { var v = JSON.parse(window[area].getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { window[area].setItem(k, JSON.stringify(v)); } catch (e) { /* blocked */ } },
    del: function (k) { try { window[area].removeItem(k); } catch (e) { /* blocked */ } }
  };
}
var ls = store('localStorage'), ss = store('sessionStorage');
var S = {}, P = {}, meta = {}, cart = ls.get('gl_cart', {}), geo = null, busy = false;
var SINGLE_MAX = 1800, PART_MAX = 1500;

/* ---------- load ---------- */
function app(h) { $('#app').innerHTML = h; }
function sig() { return JSON.stringify(Object.keys(cart).sort().map(function (k) { return [k, cart[k]]; })); }
function load() {
  if (!window.GLACIER || /PASTE_YOUR/.test(GLACIER.API_URL)) { app('<p class="msg err">The store is not connected yet.</p>'); return; }
  Promise.all([
    fetch(GLACIER.API_URL + '?action=catalog').then(function (r) { return r.json(); }),
    fetch(GLACIER.API_URL + '?action=settings').then(function (r) { return r.json(); })
  ]).then(function (a) {
    if (!a[0].ok) throw new Error(a[0].error);
    meta = { syncedAt: a[0].syncedAt, stale: a[0].stale }; S = a[1].ok ? a[1].settings : {};
    setCatalog(a[0].products);
    ls.set('gl_cache', { P: a[0].products, meta: meta, S: S });
    render();
  }).catch(function () {
    var k = ls.get('gl_cache');
    if (k) { S = k.S || {}; meta = { syncedAt: k.meta.syncedAt, stale: true }; setCatalog(k.P); render(); }
    else app('<p class="msg err">We could not load the store. Please check your internet, or call the store to order.</p><p><button class="btn pri" onclick="location.reload()">Try Again</button> ' + callBtn() + '</p>');
  });
}
function setCatalog(list) { P = {}; list.forEach(function (p) { P[p.key] = p; }); }
function waNum() { return (S.WhatsAppNumber || '').replace(/\D/g, ''); }
function waReady() { return waNum().length >= 10 && !/X/i.test(S.WhatsAppNumber || ''); }
function callBtn() { return S.Phone ? '<a class="btn" href="tel:' + esc(S.Phone.replace(/[^\d+]/g, '')) + '">\uD83D\uDCDE Call the store</a>' : ''; }
function ist(iso) { return iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''; }

/* ---------- cart review (estimate only; the server recalculates) ---------- */
function est() {
  var lines = [], bad = [], sub = 0, sav = 0;
  Object.keys(cart).forEach(function (k) {
    var p = P[k], q = cart[k];
    if (!p || !p.inStock) { bad.push(p ? p.name + ' is out of stock' : 'An item is no longer sold'); return; }
    if (q > Math.min(p.stock, p.maxQty || 999)) bad.push('Only ' + Math.min(p.stock, p.maxQty || 999) + ' of ' + p.name + ' available');
    lines.push({ key: k, name: p.name, variant: p.variant, size: p.size, qty: q, price: p.price, mrp: p.mrp, lineTotal: Math.round(p.price * q * 100) / 100 });
    sub += p.price * q; sav += (p.mrp - p.price) * q;
  });
  return { lines: lines, bad: bad, subtotal: Math.round(sub * 100) / 100, savings: Math.round(sav * 100) / 100 };
}
function deliveryFee(sub, mode) {
  var free = +S.FreeDeliveryAbove || 0, ch = +S.DeliveryCharge || 0;
  return mode === 'pickup' ? 0 : (free > 0 && sub >= free ? 0 : ch);
}
function mode() { var r = document.querySelector('input[name=mode]:checked'); return r ? r.value : 'delivery'; }
function totalsHtml() {
  var e = est(), m = mode(), d = deliveryFee(e.subtotal, m), min = +S.MinOrder || 0;
  return '<div class="cl"><span>Items total</span><b>' + rs(e.subtotal) + '</b></div>' + (e.savings > 0 ? '<div class="cl save"><span>You save (vs MRP)</span><b>' + rs(e.savings) + '</b></div>' : '') +
    '<div class="cl"><span>' + (m === 'pickup' ? 'Store pickup' : 'Delivery charge') + '</span><b>' + (d ? rs(d) : 'Free') + '</b></div><div class="cl pr"><span>Estimated total</span><b>' + rs(e.subtotal + d) + '</b></div>' +
    (m === 'delivery' && min && e.subtotal < min ? '<p class="warn">Minimum order for home delivery is ' + rs(min) + '. Add ' + rs(min - e.subtotal) + ' more, or choose store pickup.</p>' : '');
}
function updateTotals() { var t = $('#totals'); if (t) t.innerHTML = totalsHtml(); var d = $('#delbox'); if (d) d.hidden = mode() === 'pickup'; var l = $('#timelbl'); if (l) l.textContent = mode() === 'pickup' ? 'Preferred pickup time' : 'Preferred delivery time'; }

/* ---------- form ---------- */
function field(id, label, o) {
  o = o || {};
  return '<div class="fld"><label for="' + id + '">' + label + (o.opt ? ' <span class="opt">(optional)</span>' : '') + '</label>' + (o.hint ? '<div class="hint" id="h-' + id + '">' + o.hint + '</div>' : '') +
    (o.ta ? '<textarea id="' + id + '" rows="3"></textarea>' : '<input id="' + id + '" type="' + (o.type || 'text') + '"' + (o.im ? ' inputmode="' + o.im + '"' : '') + (o.ac ? ' autocomplete="' + o.ac + '"' : '') + (o.max ? ' maxlength="' + o.max + '"' : '') + '>') + '<div class="err" id="e-' + id + '"></div></div>';
}
function render() {
  document.title = 'Checkout - GLACIER';
  if (meta.stale) $('#banner').textContent = 'Stock information was last updated ' + ist(meta.syncedAt) + '. The store will confirm availability.';
  var last = ss.get('gl_last');
  if (last && last.sig === sig()) { result(last); return; }
  var e = est();
  if (!Object.keys(cart).length) { app('<h1>Your cart is empty</h1><p class="msg">Please add some products first.</p><a class="btn pri" href="index.html">Go to the Store</a>'); return; }
  var pins = (S.DeliveryPincodes || '').split(',').map(function (x) { return x.trim(); }).filter(String);
  var opts = (S.PaymentOptions || '').split('|').map(function (x) { return x.trim(); }).filter(String);
  var saved = ls.get('gl_addr');
  app('<h1>Checkout</h1><p>Check your order, fill in your details, and send it to the store on WhatsApp. No payment is taken online.</p>' +
    '<div id="sum" role="alert" tabindex="-1"></div>' +
    '<section class="box"><h2>1. Your order</h2>' + e.lines.map(function (l) { return '<div class="cl"><span>' + esc(l.name) + (l.size || l.variant ? ' <small>(' + esc(l.size || l.variant) + ')</small>' : '') + '<br>' + l.qty + ' \u00D7 ' + rs(l.price) + '</span><b>' + rs(l.lineTotal) + '</b></div>'; }).join('') +
    (e.bad.length ? '<p class="warn">' + e.bad.map(esc).join('<br>') + '<br><a href="index.html?cart=1">Please fix your cart</a></p>' : '') +
    '<div id="totals">' + totalsHtml() + '</div><a href="index.html?cart=1">\u2190 Change items</a></section>' +
    '<section class="box"><h2>2. Your details</h2>' + field('name', 'Your name', { ac: 'name' }) + field('phone', 'Mobile number', { type: 'tel', im: 'numeric', ac: 'tel', max: 14, hint: '10-digit number, so the store can call you' }) + '</section>' +
    '<section class="box"><h2>3. Delivery or pickup</h2><label class="radio"><input type="radio" name="mode" value="delivery" checked> Home delivery</label>' +
    (/^y/i.test(S.PickupEnabled || 'yes') ? '<label class="radio"><input type="radio" name="mode" value="pickup"> I will collect from the store</label>' : '') +
    (pins.length ? '<p class="hint">We deliver to PIN codes: ' + esc(pins.join(', ')) + '</p>' : '') +
    '<div id="delbox"><div class="fld"><button type="button" class="btn big" id="geob">\uD83D\uDCCD Use My Current Location</button><div id="geos" aria-live="polite" class="hint"></div></div>' +
    '<p class="hint">Location is optional and helps our rider find you. Please still type your address below.</p>' +
    field('house', 'House / flat number') + field('street', 'Building, street and landmark') + field('area', 'Area / locality') + field('city', 'City') + field('pin', 'PIN code', { im: 'numeric', max: 6, ac: 'postal-code' }) +
    field('mapl', 'Google Maps link', { opt: 1, type: 'url', hint: 'Only if you already have one. Not needed if you used the location button.' }) + field('notes', 'Delivery instructions', { opt: 1, ta: 1, hint: 'For example: ring the bell twice, 2nd floor' }) + '</div>' +
    '<div class="fld"><label for="dtime" id="timelbl">Preferred delivery time</label><select id="dtime"><option>As soon as possible</option><option>Morning (9 am - 12 pm)</option><option>Afternoon (12 pm - 4 pm)</option><option>Evening (4 pm - 8 pm)</option><option>Night (8 pm - 10 pm)</option></select></div></section>' +
    '<section class="box"><h2>4. Payment</h2><p class="hint">You pay the store directly. The store confirms how.</p>' + (opts.length ? '<div class="fld"><label for="pay">How would you like to pay?</label><select id="pay"><option value="">Please choose...</option>' + opts.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select><div class="err" id="e-pay"></div></div>' : '') + '</section>' +
    '<label class="radio" style="font-weight:400"><input type="checkbox" id="remember"> Save my name and address on this phone for next time</label>' +
    (saved ? '<p><button type="button" class="btn sm" id="forget">Forget my saved details</button></p>' : '') +
    '<p class="hint">Your order is only a request until the store confirms it on WhatsApp.</p>' +
    '<button type="button" class="btn wa" id="place">Place Order on WhatsApp</button><p>' + callBtn() + '</p>');
  if (saved) { ['name', 'phone', 'house', 'street', 'area', 'city', 'pin'].forEach(function (k) { if (saved[k] != null && $('#' + k)) $('#' + k).value = saved[k]; }); $('#remember').checked = true; }
  if (!$('#city').value) $('#city').value = 'Jaipur';
  updateTotals();
}

/* ---------- location ---------- */
function locate() {
  var s = $('#geos');
  if (!navigator.geolocation) { s.textContent = 'Your phone cannot share location here. Please type your address below.'; return; }
  s.textContent = 'Finding your location... please press Allow if your phone asks.';
  navigator.geolocation.getCurrentPosition(function (p) {
    geo = { lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) };
    var link = geoLink();
    s.innerHTML = '<span class="ok">\u2714 Location saved</span> (about ' + geo.acc + ' metres accurate). <a href="' + esc(link) + '" target="_blank" rel="noopener">Check on map</a> <button type="button" class="btn sm" id="geox">Remove location</button>';
  }, function (err) {
    s.textContent = err.code === 1 ? 'No problem, location was not shared. Please type your address below.' : 'We could not find your location. Please type your address below.';
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}
function geoLink() { return geo ? 'https://www.google.com/maps?q=' + geo.lat.toFixed(6) + ',' + geo.lng.toFixed(6) : ''; }

/* ---------- validation ---------- */
function v(id) { var e = $('#' + id); return e ? e.value.trim() : ''; }
function validate() {
  var er = [], d = { mode: mode() }, pins = (S.DeliveryPincodes || '').split(',').map(function (x) { return x.trim(); }).filter(String);
  function bad(id, m) { er.push({ id: id, m: m }); }
  d.name = v('name'); if (d.name.length < 2) bad('name', 'Please enter your name.');
  d.phone = v('phone').replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '');
  if (!/^[6-9]\d{9}$/.test(d.phone)) bad('phone', 'Please enter a 10-digit mobile number, for example 9876543210.');
  if (d.mode === 'delivery') {
    d.house = v('house'); d.street = v('street'); d.area = v('area'); d.city = v('city'); d.pin = v('pin');
    if (!d.house) bad('house', 'Please enter your house or flat number.');
    if (!d.area) bad('area', 'Please enter your area or locality.');
    if (!d.city) bad('city', 'Please enter your city.');
    if (!/^\d{6}$/.test(d.pin)) bad('pin', 'Please enter a 6-digit PIN code.');
    else if (pins.length && pins.indexOf(d.pin) < 0) bad('pin', 'Sorry, we do not deliver to ' + d.pin + ' yet. You can choose store pickup.');
    d.address = [d.house, d.street, d.area, d.city + ' - ' + d.pin].filter(function (x) { return x; }).join(', ');
    var ml = v('mapl'); if (ml && !/^https:\/\//i.test(ml)) bad('mapl', 'The map link must start with https://'); d.mapLink = geo ? geoLink() : ml;
    d.instructions = v('notes');
  } else { d.address = 'Store pickup'; d.pin = ''; d.mapLink = ''; d.instructions = ''; }
  d.time = $('#dtime').value;
  var pay = $('#pay'); d.payment = pay ? pay.value : 'To be confirmed with store';
  if (pay && !d.payment) bad('pay', 'Please choose how you would like to pay.');
  var e = est(); if (e.bad.length || !e.lines.length) bad('place', 'Please fix the problem with your cart first.');
  return { errors: er, data: d };
}
function showErrors(er) {
  document.querySelectorAll('.err').forEach(function (x) { x.textContent = ''; });
  document.querySelectorAll('[aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
  var s = $('#sum');
  if (!er.length) { s.innerHTML = ''; return; }
  er.forEach(function (x) { var el = $('#' + x.id), m = $('#e-' + x.id); if (m) m.textContent = x.m; if (el && x.id !== 'place') { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', 'e-' + x.id); } });
  s.innerHTML = 'Please fix the following:<ul>' + er.map(function (x) { return '<li>' + (x.id === 'place' ? '' : '<a href="#' + x.id + '">') + esc(x.m) + (x.id === 'place' ? '' : '</a>') + '</li>'; }).join('') + '</ul>';
  s.focus(); s.scrollIntoView({ block: 'start' });
}

/* ---------- WhatsApp message ---------- */
function blocks(o, d, unchecked) {
  var b = [], pick = d.mode === 'pickup';
  b.push('*GLACIER ICE CREAM PARLOR \u2014 NEW ORDER*' + (unchecked ? '\n\u26A0 NOT VERIFIED: the website could not check prices or stock. Please verify before accepting.' : '') +
    '\n\nOrder reference: ' + o.ref + '\nCustomer name: ' + d.name + '\nMobile number: ' + d.phone +
    '\nDelivery address: ' + (pick ? 'Store pickup (customer will collect)' : d.address) + '\nGoogle Maps location: ' + (d.mapLink || 'Not shared') +
    '\nDelivery instructions: ' + (d.instructions || 'None') + '\nPreferred ' + (pick ? 'pickup' : 'delivery') + ' time: ' + d.time + '\n\n*ITEMS*');
  o.lines.forEach(function (l, i) {
    b.push((i + 1) + '. ' + l.name + (l.variant || l.size ? ' \u2014 ' + [l.variant, l.size].filter(function (x) { return x; }).join(' ') : '') + '\n   ' + l.qty + ' \u00D7 ' + rs(l.price) + ' = ' + rs(l.lineTotal));
  });
  b.push('Subtotal: ' + rs(o.subtotal) + '\nSavings vs MRP: ' + rs(o.savings) + '\nDelivery charge: ' + (pick ? 'Store pickup, no charge' : o.delivery ? rs(o.delivery) : 'Free') + '\n*Estimated total: ' + rs(o.total) + '*\nPayment preference: ' + d.payment +
    '\n\nStock and prices checked at: ' + (unchecked ? 'NOT CHECKED' : ist(o.checkedAt) + ' IST') + '\nPlease confirm availability and accept this order.');
  return b;
}
function enc(s) { return encodeURIComponent(s).length; }
function makeParts(bl, ref) {
  var parts = [], cur = '';
  bl.forEach(function (x) {
    var t = cur ? cur + '\n\n' + x : x;
    if (cur && enc(t) > PART_MAX - 80) { parts.push(cur); cur = x; } else cur = t;
  });
  if (cur) parts.push(cur);
  return parts.map(function (p, i) { return '(Part ' + (i + 1) + ' of ' + parts.length + ' \u2014 order ' + ref + ')\n\n' + p; });
}
function finish(o, d, unchecked) {
  var bl = blocks(o, d, unchecked), msg = bl.join('\n\n'), rec = { sig: sig(), ref: o.ref, msg: msg, unchecked: unchecked, total: o.total };
  if (enc(msg) > SINGLE_MAX) rec.parts = makeParts(bl, o.ref);
  ss.set('gl_last', rec);
  if ($('#remember') && $('#remember').checked) ls.set('gl_addr', { name: d.name, phone: d.phone, house: d.house || '', street: d.street || '', area: d.area || '', city: d.city || '', pin: d.pin || '' });
  else ls.del('gl_addr');
  result(rec); window.scrollTo(0, 0);
}
function waUrl(text) { return 'https://wa.me/' + waNum() + (text ? '?text=' + encodeURIComponent(text) : ''); }
function result(r) {
  var h = '<h1>Almost done: send your order</h1><div class="msg"><b>Your order has NOT been sent or confirmed yet.</b><br>The green button opens WhatsApp. You must then press <b>Send</b> inside WhatsApp. The store will reply to confirm availability, price and delivery.</div>' +
    '<p>Order reference: <b>' + esc(r.ref) + '</b></p>' + (r.unchecked ? '<p class="warn">Prices and stock could not be checked by the website. The store will verify them.</p>' : '');
  if (!waReady()) h += '<p class="warn">The store\u2019s WhatsApp number is not set up on this website. Please copy your order and call the store.</p>';
  else if (!r.parts) h += '<a class="btn wa" href="' + esc(waUrl(r.msg)) + '" target="_blank" rel="noopener">Open WhatsApp and Send Order</a>';
  else {
    h += '<p class="msg">Your order is long, so it is split into <b>' + r.parts.length + ' messages</b> to make sure nothing is lost. Send each one in WhatsApp, in order. Or press <b>Copy full order</b>, open WhatsApp and paste it.</p>';
    r.parts.forEach(function (p, i) { h += '<a class="btn wa" href="' + esc(waUrl(p)) + '" target="_blank" rel="noopener">Send message ' + (i + 1) + ' of ' + r.parts.length + '</a>'; });
    h += '<a class="btn" style="width:100%" href="' + esc(waUrl('')) + '" target="_blank" rel="noopener">Just open the store\u2019s WhatsApp chat</a>';
  }
  h += '<p><button class="btn big" id="copy">Copy full order</button></p><details><summary class="btn" style="width:100%">Show my order message</summary><textarea class="out" readonly id="outm">' + esc(r.msg) + '</textarea></details>' +
    '<p>' + callBtn() + ' <a class="btn" href="index.html">Return to Store</a></p><p class="hint">Need to change something? <button type="button" class="btn sm" id="edit">Change my order</button> If you already sent this one, tell the store to ignore it.</p>' +
    '<p><button type="button" class="btn sm" id="newo">Start a new order (empties cart)</button></p>';
  app(h);
}
function copyText(t) {
  var done = function () { toast('Order copied. Paste it in WhatsApp.'); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
  function fallback() { var a = $('#outm'); if (a) { a.parentNode.open = true; a.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Please select the text and copy it.'); } } }
}
function toast(m) { var t = $('#toast'); t.textContent = m; clearTimeout(toast.t); toast.t = setTimeout(function () { t.textContent = ''; }, 4000); }

/* ---------- place the order ---------- */
function place() {
  if (busy) return;
  var chk = validate(); showErrors(chk.errors);
  if (chk.errors.length) return;
  var d = chk.data, b = $('#place'); busy = true; b.disabled = true; b.textContent = 'Checking stock and prices...';
  var body = { action: 'order', mode: d.mode, payment: d.payment, deliveryTime: d.time,
    items: Object.keys(cart).map(function (k) { return { key: k, qty: cart[k] }; }),
    customer: { name: d.name, phone: d.phone, pin: d.pin, address: d.address, mapLink: d.mapLink, instructions: d.instructions } };
  fetch(GLACIER.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
    .then(function (r) { return r.json(); })
    .then(function (o) {
      busy = false; b.disabled = false; b.textContent = 'Place Order on WhatsApp';
      if (o.ok) { finish(o, d, false); return; }
      var iss = (o.issues && o.issues.length) ? o.issues : [o.error || 'We could not check your order.'];
      showErrors(iss.map(function (m) { return { id: 'place', m: m }; }));
      if (o.lines) { var s = $('#sum'); s.innerHTML += '<p><a href="index.html?cart=1">Go back to your cart</a></p>'; }
    })
    .catch(function () {
      busy = false; b.disabled = false; b.textContent = 'Place Order on WhatsApp';
      var s = $('#sum');
      s.innerHTML = 'We could not reach the store\u2019s system to check stock and prices. You can try again, or send your order to the store anyway. The store will check it by hand.' +
        '<p><button type="button" class="btn" id="retry">Try Again</button> <button type="button" class="btn" id="unchk">Send to Store Anyway</button></p>';
      s.focus(); s.dataset.chk = '1'; window._pending = d;
    });
}
function unchecked() {
  var d = window._pending, e = est(), m = d.mode, del = deliveryFee(e.subtotal, m);
  finish({ ref: 'GL-U-' + Date.now().toString(36).toUpperCase(), lines: e.lines, subtotal: e.subtotal, savings: e.savings, delivery: del, total: e.subtotal + del, checkedAt: null }, d, true);
}

/* ---------- events ---------- */
document.addEventListener('click', function (e) {
  var id = e.target.id;
  if (id === 'place') place();
  else if (id === 'geob') locate();
  else if (id === 'geox') { geo = null; $('#geos').textContent = 'Location removed.'; }
  else if (id === 'forget') { ls.del('gl_addr'); e.target.remove(); toast('Saved details removed from this phone.'); }
  else if (id === 'copy') { var l = ss.get('gl_last'); if (l) copyText(l.msg); }
  else if (id === 'edit') { ss.del('gl_last'); render(); }
  else if (id === 'newo') { if (confirm('Empty your cart and start again?')) { ss.del('gl_last'); ls.set('gl_cart', {}); cart = {}; render(); } }
  else if (id === 'retry') place();
  else if (id === 'unchk') unchecked();
});
document.addEventListener('change', function (e) { if (e.target.name === 'mode') updateTotals(); });
load();
})();
