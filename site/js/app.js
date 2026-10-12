(function () {
'use strict';
var $ = function (s) { return document.querySelector(s); };
var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
var rs = function (n) { return '\u20B9' + (Math.round(n * 100) / 100).toLocaleString('en-IN'); };
var FB = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#e8f4fd"/><text x="100" y="125" font-size="80" text-anchor="middle">\uD83C\uDF66</text></svg>');
var ls = {
  get: function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
};
var P = [], by = {}, S = {}, meta = {}, cart = ls.get('gl_cart', {}), lastQ = null, lastSc = null, sugList = [], sugI = -1;
var SYN = { drink: 'beverage', drinks: 'beverages', biscuit: 'cookies', biscuits: 'cookies', icecream: 'ice' };
var SIZES = [100, 112.5, 125, 140];

/* ---------- loading ---------- */
function load() {
  if (!window.GLACIER || /PASTE_YOUR/.test(GLACIER.API_URL)) { app('<p class="msg err">The store is not connected yet. Set API_URL in js/config.js.</p>'); return; }
  Promise.all([
    fetch(GLACIER.API_URL + '?action=catalog').then(function (r) { return r.json(); }),
    fetch(GLACIER.API_URL + '?action=settings').then(function (r) { return r.json(); })
  ]).then(function (a) {
    if (!a[0].ok) throw new Error(a[0].error);
    P = a[0].products; meta = { syncedAt: a[0].syncedAt, stale: a[0].stale }; S = a[1].ok ? a[1].settings : {};
    ls.set('gl_cache', { P: P, meta: meta, S: S });
    start();
  }).catch(function () {
    var k = ls.get('gl_cache');
    if (k) { P = k.P; S = k.S || {}; meta = { syncedAt: k.meta.syncedAt, stale: true, offline: true }; start(); }
    else app('<p class="msg err">We could not load the products. Please check your internet and try again, or call the store to order.</p><p><button class="btn pri" onclick="location.reload()">Try Again</button> ' + callLink() + '</p>');
  });
}
function start() { index(); drawNav(); drawBanner(); drawFoot(); updateCart(); route(); if (/[?&]cart=1/.test(location.search)) renderCart(); }
function app(h) { $('#app').innerHTML = h; }
function callLink() { return S.Phone ? '<a class="btn" href="tel:' + esc(S.Phone.replace(/[^\d+]/g, '')) + '">\uD83D\uDCDE Call ' + esc(S.Phone) + '</a>' : ''; }
function waNum() { return (S.WhatsAppNumber || '').replace(/\D/g, ''); }
function waLink() { return waNum() && !/X/i.test(S.WhatsAppNumber) ? '<a class="btn" href="https://wa.me/' + waNum() + '">\uD83D\uDCAC WhatsApp us</a>' : ''; }
function when() { return meta.syncedAt ? new Date(meta.syncedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : 'unknown'; }
function drawBanner() {
  $('#banner').textContent = meta.stale ? 'Stock information was last updated ' + when() + (meta.offline ? ' (you appear to be offline)' : '') + '. Please confirm availability with the store.' : '';
}

/* ---------- indexing and search ---------- */
function norm(s) {
  return String(s || '').toLowerCase()
    .replace(/(\d)\s*(litres?|liters?|ltrs?|ltr)\b/g, '$1l').replace(/(\d)\s*(millilitres?|ml)\b/g, '$1ml')
    .replace(/(\d)\s*(kilograms?|kgs?)\b/g, '$1kg').replace(/(\d)\s*(grams?|gms?|gm|g)\b/g, '$1g').replace(/(\d)\s*l\b/g, '$1l')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
function index() {
  by = {};
  P.forEach(function (p) {
    by[p.key] = p;
    p._t = (p.tags || '').split(/[,;|]/).map(function (x) { return x.trim(); }).filter(Boolean);
    p._sz = p.size || p.variant || '';
    p._b = norm([p.name, p.brand, p.category, p.subcategory, p.tags, p.sku, p.size, p.variant, p.unit].join(' '));
    p._w = p._b.split(' '); p._nw = norm(p.name + ' ' + p.brand).split(' ');
  });
  var ch = false;
  Object.keys(cart).forEach(function (k) { var p = by[k]; if (p && p.inStock) { var m = lim(p); if (cart[k] > m) { cart[k] = m; ch = true; } } });
  if (ch) { saveCart(); toast('Some cart quantities were changed to match stock.'); }
}
function lev(a, b, m) {
  if (Math.abs(a.length - b.length) > m) return m + 1;
  var p = []; for (var j = 0; j <= b.length; j++) p.push(j);
  for (var i = 1; i <= a.length; i++) {
    var c = [i];
    for (j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[b.length];
}
function score(p, toks) {
  var tot = 0;
  for (var i = 0; i < toks.length; i++) {
    var t = toks[i], best = 0, alts = SYN[t] ? [t, SYN[t]] : [t];
    for (var k = 0; k < alts.length; k++) {
      var a = alts[k], s = 0;
      if (p._nw.indexOf(a) >= 0) s = 10;
      else if (p._nw.some(function (w) { return w.indexOf(a) === 0; })) s = 8;
      else if (p._b.indexOf(a) >= 0) s = 5;
      else if (a.length >= 4) { var m = a.length >= 7 ? 2 : 1; if (p._w.some(function (w) { return lev(a, w, m) <= m; })) s = 3; }
      if (s > best) best = s;
    }
    if (!best) return 0;
    tot += best;
  }
  return tot;
}
function searchBase(q) {
  if (!q) return { list: P, sc: {} };
  if (q === lastQ) return lastSc;
  var toks = norm(q).split(' ').filter(Boolean), sc = {}, list = [];
  P.forEach(function (p) { var s = score(p, toks); if (s) { sc[p.key] = s; list.push(p); } });
  lastQ = q; lastSc = { list: list, sc: sc };
  return lastSc;
}

/* ---------- state in the URL (keeps filters when going back) ---------- */
function parse() { var h = location.hash.slice(1) || '/', i = h.indexOf('?'); return { path: i < 0 ? h : h.slice(0, i), u: new URLSearchParams(i < 0 ? '' : h.slice(i + 1)) }; }
function stateFrom(u) {
  return { q: u.get('q') || '', brand: u.getAll('brand'), cat: u.getAll('cat'), sub: u.getAll('sub'), size: u.getAll('size'), tag: u.getAll('tag'),
    min: u.get('min') || '', max: u.get('max') || '', stock: u.get('stock') === '1', offer: u.get('offer') === '1', sort: u.get('sort') || '', n: parseInt(u.get('n'), 10) || 24, all: u.get('all') === '1' };
}
function toHash(st) {
  var u = new URLSearchParams();
  if (st.q) u.set('q', st.q);
  ['brand', 'cat', 'sub', 'size', 'tag'].forEach(function (k) { st[k].forEach(function (v) { u.append(k, v); }); });
  if (st.min) u.set('min', st.min); if (st.max) u.set('max', st.max);
  if (st.stock) u.set('stock', '1'); if (st.offer) u.set('offer', '1'); if (st.sort) u.set('sort', st.sort);
  if (st.n > 24) u.set('n', st.n); if (st.all) u.set('all', '1');
  return '#/?' + u.toString();
}
function cur() { return stateFrom(parse().u); }
function mutate(fn) { var st = cur(); fn(st); st.n = 24; if (st.q || st.brand.length || st.cat.length || st.sub.length || st.size.length || st.tag.length || st.min || st.max || st.stock || st.offer || st.sort) st.all = false; location.hash = toHash(st); }
function hasFilter(st) { return st.q || st.brand.length || st.cat.length || st.sub.length || st.size.length || st.tag.length || st.min || st.max || st.stock || st.offer || st.sort || st.all; }
function vals(p, k) { return k === 'brand' ? [p.brand] : k === 'cat' ? [p.category] : k === 'sub' ? [p.subcategory] : k === 'size' ? [p._sz] : p._t; }
function match(p, st, skip) {
  var ks = ['brand', 'cat', 'sub', 'size', 'tag'];
  for (var i = 0; i < ks.length; i++) {
    var k = ks[i]; if (k === skip || !st[k].length) continue;
    if (!vals(p, k).some(function (v) { return st[k].indexOf(v) >= 0; })) return false;
  }
  if (st.min !== '' && p.price < +st.min) return false;
  if (st.max !== '' && p.price > +st.max) return false;
  if (st.stock && !p.inStock) return false;
  if (st.offer && !(p.mrp > p.price)) return false;
  return true;
}

/* ---------- sorting ---------- */
var N = function (x) { return x ? 1 : 0; };
function rec(a, b) { return (N(b.inStock) - N(a.inStock)) || (N(b.featured) - N(a.featured)) || (N(b.bestSeller) - N(a.bestSeller)) || (b.discountPct - a.discountPct) || a.name.localeCompare(b.name); }
var SORTS = {
  recommended: ['Recommended', rec],
  relevance: ['Relevance to search', null],
  best: ['Best sellers first', function (a, b) { return (N(b.bestSeller) - N(a.bestSeller)) || rec(a, b); }],
  'new': ['New arrivals first', function (a, b) { return (N(b.isNew) - N(a.isNew)) || rec(a, b); }],
  plh: ['Price: Low to High', function (a, b) { return a.price - b.price || rec(a, b); }],
  phl: ['Price: High to Low', function (a, b) { return b.price - a.price || rec(a, b); }],
  disc: ['Highest discount', function (a, b) { return (b.discountPct - a.discountPct) || rec(a, b); }],
  az: ['Name: A to Z', function (a, b) { return a.name.localeCompare(b.name); }],
  za: ['Name: Z to A', function (a, b) { return b.name.localeCompare(a.name); }],
  brand: ['Brand name', function (a, b) { return (a.brand || '\uffff').localeCompare(b.brand || '\uffff') || a.name.localeCompare(b.name); }],
  avail: ['Availability (in stock first)', function (a, b) { return (N(b.inStock) - N(a.inStock)) || (b.stock - a.stock) || a.name.localeCompare(b.name); }]
};

/* ---------- cart ---------- */
function lim(p) { return Math.min(p.stock, p.maxQty || 999); }
function saveCart() { ls.set('gl_cart', cart); }
function toast(m) { var t = $('#toast'); t.textContent = m; clearTimeout(toast.t); toast.t = setTimeout(function () { t.textContent = ''; }, 3500); }
function act(a, k) {
  var p = by[k], c = cart[k] || 0; if (!p) return;
  if (a === 'add') {
    if (!p.inStock) return;
    if (p.minQty > lim(p)) { toast('Sorry, not enough stock for the minimum order of this item.'); return; }
    cart[k] = p.minQty;
  } else if (a === 'inc') {
    if (c + 1 > lim(p)) { toast(p.maxQty && c + 1 > p.maxQty ? 'Maximum ' + p.maxQty + ' per order for this item.' : 'Only ' + p.stock + ' available.'); return; }
    cart[k] = c + 1;
  } else if (a === 'dec') {
    if (c - 1 < p.minQty) delete cart[k]; else cart[k] = c - 1;
  } else if (a === 'rm') { delete cart[k]; }
  saveCart(); updateCart(); refreshCtl(k, a);
  if (!$('#cart').hidden) renderCart(a === 'rm' ? 'rm' : null);
}
function ctlInner(p) {
  var q = cart[p.key] || 0, k = esc(p.key);
  if (!p.inStock) return '<button class="btn" disabled>Out of stock</button>';
  if (!q) return '<button class="btn pri" data-act="add" data-k="' + k + '">\uD83D\uDED2 Add to Cart</button>';
  return '<div class="step"><button class="btn" data-act="dec" data-k="' + k + '" aria-label="Remove one ' + esc(p.name) + '">\u2212</button><b aria-live="polite">' + q + '</b><button class="btn" data-act="inc" data-k="' + k + '" aria-label="Add one ' + esc(p.name) + '">+</button></div>';
}
function refreshCtl(k, a) {
  var p = by[k], was = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.act;
  document.querySelectorAll('.ctl').forEach(function (el) {
    if (el.dataset.k !== k) return;
    var mine = el.contains(document.activeElement);
    el.innerHTML = ctlInner(p);
    if (mine) { var b = el.querySelector(a === 'dec' ? '[data-act=dec],[data-act=add]' : '[data-act=inc]') || el.querySelector('button'); if (b) b.focus(); }
  });
}
function cartLines() { return Object.keys(cart).map(function (k) { return { k: k, p: by[k], q: cart[k] }; }); }
function updateCart() {
  var n = 0, tot = 0;
  cartLines().forEach(function (l) { if (l.p && l.p.inStock) { n += l.q; tot += l.q * l.p.price; } });
  $('#cc').textContent = n; $('#ct').textContent = n ? rs(tot) : 'Empty';
}
function renderCart(focus) {
  var L = cartLines(), sub = 0, sav = 0, bad = false, h = '<div class="row"><h2 id="ch" tabindex="-1">Your Cart</h2><button class="btn" data-close="1">\u2715 Close</button></div>';
  if (!L.length) h += '<p class="msg">Your cart is empty. Add some products to begin.</p><button class="btn pri" data-close="1">Continue Shopping</button>';
  else {
    L.forEach(function (l) {
      var p = l.p, k = esc(l.k);
      if (!p || !p.inStock) { bad = true; h += '<div class="line"><div></div><div><b>' + esc(p ? p.name : 'An item') + '</b><p class="warn">' + (p ? 'Now out of stock.' : 'No longer sold.') + ' Please remove it.</p><button class="btn" data-act="rm" data-k="' + k + '">Remove</button></div></div>'; return; }
      sub += p.price * l.q; sav += (p.mrp - p.price) * l.q;
      h += '<div class="line"><img src="' + esc(p.image || FB) + '" alt=""><div><b>' + esc(p.name) + '</b><div class="sz">' + esc(p._sz) + '</div><div>' + rs(p.price) + ' each</div>' +
        '<div class="ctl" data-k="' + k + '">' + ctlInner(p) + '</div><div class="pr">' + rs(p.price * l.q) + '</div><button class="btn sm" data-act="rm" data-k="' + k + '">Remove</button></div></div>';
    });
    h += '<div class="tot"><span>Items total</span><b>' + rs(sub) + '</b></div>';
    if (sav > 0) h += '<div class="tot save"><span>You save (vs MRP)</span><b>' + rs(sav) + '</b></div>';
    var min = +S.MinOrder || 0, free = +S.FreeDeliveryAbove || 0;
    h += '<p class="sz">Delivery charge is added at checkout.' + (free ? ' Free delivery above ' + rs(free) + '.' : '') + (min ? ' Minimum order for home delivery: ' + rs(min) + '.' : '') + '</p>';
    if (meta.stale) h += '<p class="warn">Stock may be out of date. The store will confirm availability.</p>';
    h += bad ? '<p class="warn">Please remove the items marked above before checkout.</p><a class="btn" aria-disabled="true">Continue to Checkout</a>' : '<a class="btn pri" href="checkout.html" style="width:100%">Continue to Checkout \u2192</a>';
    h += '<p><button class="btn" data-clear="1">Empty the Cart</button></p>';
  }
  $('#cart').innerHTML = h;
  if (focus !== 'rm') { $('#cart').hidden = false; $('#bd').hidden = false; var f = $('#ch'); if (f) f.focus(); }
}
function closeUI() { $('#cart').hidden = true; $('#bd').hidden = true; document.body.classList.remove('fopen'); }

/* ---------- views ---------- */
function stockHtml(p) { return p.inStock ? (p.lowStock ? '<span class="st low">Only ' + p.stock + ' left</span>' : '<span class="st ok">In stock</span>') : '<span class="st no">Out of stock</span>'; }
function priceHtml(p) { return '<div class="pr">' + rs(p.price) + (p.mrp > p.price ? '<span class="mrp">' + rs(p.mrp) + '</span>' : '') + '</div>' + (p.mrp > p.price ? '<div class="save">Save ' + rs(p.mrp - p.price) + ' (' + p.discountPct + '% off)</div>' : ''); }
function pHref(p) { return '#/p/' + encodeURIComponent(p.key); }
function card(p) {
  return '<article class="card"><a class="im" href="' + pHref(p) + '" tabindex="-1" aria-hidden="true"><img src="' + esc(p.image || FB) + '" alt="" loading="lazy" width="300" height="300"></a>' +
    (p.brand ? '<p class="br">' + esc(p.brand) + '</p>' : '') + '<h3><a href="' + pHref(p) + '">' + esc(p.name) + '</a></h3>' + (p._sz ? '<div class="sz">' + esc(p._sz) + '</div>' : '') +
    priceHtml(p) + stockHtml(p) + '<div class="ctl" data-k="' + esc(p.key) + '">' + ctlInner(p) + '</div></article>';
}
function sec(title, list, href) {
  return list.length ? '<section class="sec"><div class="sh"><h2>' + title + '</h2><a href="' + href + '">See all</a></div><div class="grid">' + list.slice(0, 8).map(card).join('') + '</div></section>' : '';
}
function count(k) { var o = {}; P.forEach(function (p) { vals(p, k).forEach(function (v) { if (v) o[v] = (o[v] || 0) + 1; }); }); return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).map(function (v) { return [v, o[v]]; }); }
function drawNav() { $('#cats').innerHTML = '<a href="#/?all=1">All Products</a>' + count('cat').map(function (c) { return '<a href="#/?cat=' + encodeURIComponent(c[0]) + '">' + esc(c[0]) + '</a>'; }).join(''); }
function home() {
  document.title = (S.StoreName || 'GLACIER ICE CREAM PARLOR') + ' - Order Online';
  var deals = P.filter(function (p) { return p.inStock && p.discountPct > 0; }).sort(SORTS.disc[1]);
  var rv = ls.get('gl_rv', []).map(function (k) { return by[k]; }).filter(Boolean);
  var del = [S.DeliveryCharge ? 'Delivery ' + rs(+S.DeliveryCharge) : '', +S.FreeDeliveryAbove ? 'free above ' + rs(+S.FreeDeliveryAbove) : '', +S.MinOrder ? 'minimum order ' + rs(+S.MinOrder) : ''].filter(Boolean).join(' \u00B7 ');
  app('<section class="sec"><h1>What would you like today?</h1><div class="tiles">' + count('cat').map(function (c) { return '<a class="tile" href="#/?cat=' + encodeURIComponent(c[0]) + '">' + esc(c[0]) + '<small>' + c[1] + ' items</small></a>'; }).join('') + '</div></section>' +
    '<div class="info"><b>How ordering works:</b> add items, enter your address, and send your order on WhatsApp. Your order is <b>pending</b> until the store confirms it.' + (del ? '<br>' + esc(del) : '') + (S.Timings ? '<br>Open: ' + esc(S.Timings) : '') + '</div>' +
    sec('Today\u2019s Deals', deals, '#/?offer=1&sort=disc') + sec('Best Sellers', P.filter(function (p) { return p.bestSeller; }), '#/?sort=best') +
    sec('Featured', P.filter(function (p) { return p.featured; }), '#/?sort=recommended') + sec('New Arrivals', P.filter(function (p) { return p.isNew; }), '#/?sort=new') +
    sec('Recently Viewed', rv, '#/?all=1') +
    '<section class="sec"><div class="sh"><h2>Brands</h2></div><div class="chips">' + count('brand').slice(0, 24).map(function (b) { return '<a class="chip" style="text-decoration:none;display:inline-flex;align-items:center" href="#/?brand=' + encodeURIComponent(b[0]) + '">' + esc(b[0]) + '</a>'; }).join('') + '</div></section>');
}
function facets(st, base) {
  var f = {};
  ['brand', 'cat', 'sub', 'size', 'tag'].forEach(function (k) {
    var o = {}; base.forEach(function (p) { if (match(p, st, k)) vals(p, k).forEach(function (v) { if (v) o[v] = (o[v] || 0) + 1; }); });
    st[k].forEach(function (v) { if (!(v in o)) o[v] = 0; });
    f[k] = Object.keys(o).sort(function (a, b) { return o[b] - o[a] || a.localeCompare(b); }).map(function (v) { return [v, o[v]]; });
  });
  return f;
}
function group(k, title, arr, st) {
  if (!arr.length) return '';
  return '<fieldset><legend>' + title + '</legend><div class="opts">' + arr.map(function (x) {
    return '<label class="o"><input type="checkbox" data-f="' + k + '" value="' + esc(x[0]) + '"' + (st[k].indexOf(x[0]) >= 0 ? ' checked' : '') + '><span>' + esc(x[0]) + ' <em>(' + x[1] + ')</em></span></label>';
  }).join('') + '</div></fieldset>';
}
function listing(st) {
  var sb = searchBase(st.q), base = sb.list, f = facets(st, base);
  var res = base.filter(function (p) { return match(p, st); });
  var sort = st.sort && SORTS[st.sort] && (st.sort !== 'relevance' || st.q) ? st.sort : (st.q ? 'relevance' : 'recommended');
  res.sort(sort === 'relevance' ? function (a, b) { return (sb.sc[b.key] - sb.sc[a.key]) || rec(a, b); } : SORTS[sort][1]);
  var title = st.q ? 'Results for \u201C' + esc(st.q) + '\u201D' : st.cat.length === 1 ? esc(st.cat[0]) : st.brand.length === 1 ? esc(st.brand[0]) : 'All Products';
  document.title = title.replace(/&[^;]+;/g, '') + ' - GLACIER';
  var crumb = '<nav class="crumb" aria-label="Breadcrumb"><a href="#/">Home</a>' + (st.cat.length === 1 ? ' \u203A <a href="#/?cat=' + encodeURIComponent(st.cat[0]) + '">' + esc(st.cat[0]) + '</a>' : '') + (st.sub.length === 1 ? ' \u203A ' + esc(st.sub[0]) : '') + '</nav>';
  var chips = [];
  if (st.q) chips.push(['q', '', 'Search: ' + st.q]);
  ['brand', 'cat', 'sub', 'size', 'tag'].forEach(function (k) { st[k].forEach(function (v) { chips.push([k, v, v]); }); });
  if (st.min !== '' || st.max !== '') chips.push(['price', '', 'Price ' + (st.min !== '' ? rs(+st.min) : '\u20B90') + ' - ' + (st.max !== '' ? rs(+st.max) : 'any')]);
  if (st.stock) chips.push(['stock', '', 'In stock only']); if (st.offer) chips.push(['offer', '', 'Offers only']);
  var ch = chips.length ? '<div class="chips" aria-label="Active filters">' + chips.map(function (c) { return '<button class="chip" data-rm="' + c[0] + '" data-v="' + esc(c[1]) + '">' + esc(c[2]) + ' \u2715</button>'; }).join('') + '<button class="chip" data-clear="1">Clear All Filters</button></div>' : '';
  var fl = '<aside id="filters" aria-label="Filters"><div class="row"><h2>Filters</h2><button class="btn" data-fclose="1">Show ' + res.length + ' products</button></div>' +
    '<fieldset><legend>Availability and offers</legend><label class="o"><input type="checkbox" data-f="stock"' + (st.stock ? ' checked' : '') + '><span>In stock only</span></label><label class="o"><input type="checkbox" data-f="offer"' + (st.offer ? ' checked' : '') + '><span>Offers and discounts</span></label></fieldset>' +
    group('cat', 'Category', f.cat, st) + group('sub', 'Type / Subcategory', f.sub, st) + group('brand', 'Brand', f.brand, st) + group('size', 'Size / Weight', f.size, st) + group('tag', 'Tags', f.tag, st) +
    '<fieldset><legend>Price (\u20B9)</legend><div class="pi"><input type="number" inputmode="numeric" min="0" id="pmin" aria-label="Minimum price" placeholder="Min" value="' + esc(st.min) + '"><span>to</span><input type="number" inputmode="numeric" min="0" id="pmax" aria-label="Maximum price" placeholder="Max" value="' + esc(st.max) + '"></div>' +
    '<div class="chips"><button class="chip" data-pr="0-100">Under \u20B9100</button><button class="chip" data-pr="100-500">\u20B9100 - \u20B9500</button><button class="chip" data-pr="500-">Over \u20B9500</button></div></fieldset></aside>';
  var shown = res.slice(0, st.n);
  var body = !res.length ? '<div class="msg"><b>No products found.</b><br>' + (st.q ? 'Check the spelling, or try a shorter word like \u201Cvanilla\u201D or \u201Cbiscuit\u201D.<br>' : '') + '<button class="btn pri" data-clear="1" style="margin-top:.6rem">Clear All Filters</button> ' + callLink() + '</div>' :
    '<div class="grid">' + shown.map(card).join('') + '</div>' + (res.length > shown.length ? '<p style="text-align:center"><button class="btn pri" data-more="1">Show more products (' + (res.length - shown.length) + ' left)</button></p>' : '');
  var opts = Object.keys(SORTS).filter(function (k) { return k !== 'relevance' || st.q; }).map(function (k) { return '<option value="' + k + '"' + (k === sort ? ' selected' : '') + '>' + SORTS[k][0] + '</option>'; }).join('');
  var old = $('#filters'), top = old ? old.scrollTop : 0;
  app(crumb + '<h1>' + title + '</h1><div class="bar"><span><b>' + res.length + '</b> product' + (res.length === 1 ? '' : 's') + '</span><span><button class="btn" data-fopen="1">\u2630 Filters</button> <label>Sort: <select id="sort">' + opts + '</select></label></span></div>' + ch + '<div class="lay">' + fl + '<div>' + body + '</div></div>');
  var nf = $('#filters'); if (nf) nf.scrollTop = top;
}
function product(k) {
  var p = by[k];
  if (!p) { app('<p class="msg">This product is no longer available.</p><a class="btn pri" href="#/">Back to shop</a>'); return; }
  document.title = p.name + ' - GLACIER';
  var rv = ls.get('gl_rv', []).filter(function (x) { return x !== k; }); rv.unshift(k); ls.set('gl_rv', rv.slice(0, 12));
  var rel = P.filter(function (x) { return x.key !== k && p.brand && x.brand === p.brand; });
  var sim = P.filter(function (x) { return x.key !== k && x.brand !== p.brand && p.subcategory && x.subcategory === p.subcategory; });
  if (!sim.length) sim = P.filter(function (x) { return x.key !== k && x.brand !== p.brand && p.category && x.category === p.category; });
  var rows = [['Brand', p.brand], ['Category', p.category], ['Type', p.subcategory], ['Size / weight', p.size], ['Variant', p.variant && p.variant !== p.size ? p.variant : ''], ['Unit', p.unit]].filter(function (r) { return r[1]; });
  var cat = encodeURIComponent(p.category);
  app('<nav class="crumb" aria-label="Breadcrumb"><a href="#/">Home</a>' + (p.category ? ' \u203A <a href="#/?cat=' + cat + '">' + esc(p.category) + '</a>' : '') + (p.subcategory ? ' \u203A <a href="#/?cat=' + cat + '&sub=' + encodeURIComponent(p.subcategory) + '">' + esc(p.subcategory) + '</a>' : '') + '</nav>' +
    '<button class="btn sm" onclick="history.back()">\u2190 Back</button><div class="detail"><div class="im"><img src="' + esc(p.image || FB) + '" alt="' + esc(p.name) + '"></div><div>' +
    (p.brand ? '<a href="#/?brand=' + encodeURIComponent(p.brand) + '">' + esc(p.brand) + '</a>' : '') + '<h1>' + esc(p.name) + '</h1>' + (p._sz ? '<div class="sz">' + esc(p._sz) + '</div>' : '') + priceHtml(p) + stockHtml(p) +
    (meta.stale ? '<p class="warn">Stock may be out of date. The store will confirm availability.</p>' : '') + (p.minQty > 1 ? '<p class="sz">Minimum order: ' + p.minQty + '</p>' : '') + (p.maxQty ? '<p class="sz">Maximum per order: ' + p.maxQty + '</p>' : '') +
    '<div class="ctl" data-k="' + esc(k) + '" style="max-width:20rem;margin:.6rem 0">' + ctlInner(p) + '</div>' + (p.description ? '<p>' + esc(p.description) + '</p>' : '') +
    (rows.length ? '<table class="attr">' + rows.map(function (r) { return '<tr><th>' + r[0] + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>' : '') +
    (p._t.length ? '<div class="chips">' + p._t.map(function (t) { return '<a class="chip" style="text-decoration:none;display:inline-flex;align-items:center" href="#/?tag=' + encodeURIComponent(t) + '">' + esc(t) + '</a>'; }).join('') + '</div>' : '') +
    '</div></div>' + sec('More from ' + esc(p.brand), rel, '#/?brand=' + encodeURIComponent(p.brand)) + sec('Similar products', sim, '#/?cat=' + cat) +
    sec('Recently viewed', rv.map(function (x) { return by[x]; }).filter(Boolean), '#/?all=1'));
}
function drawFoot() {
  $('#foot').innerHTML = '<div class="in"><b>' + esc(S.StoreName || 'GLACIER ICE CREAM PARLOR') + '</b><br>' + (S.Address ? esc(S.Address) + '<br>' : '') + (S.Timings ? 'Open: ' + esc(S.Timings) + '<br>' : '') +
    '<p>' + callLink() + ' ' + waLink() + '</p><p><a href="info.html">About us, delivery, returns, privacy and FAQs</a></p><small>Orders sent on WhatsApp are pending until the store confirms them. Prices and availability may change.</small></div>';
}
function route() {
  closeUI();
  var r = parse();
  $('#q').value = r.u.get('q') || ''; $('#qc').hidden = !$('#q').value;
  if (r.path.indexOf('/p/') === 0) product(decodeURIComponent(r.path.slice(3)));
  else { var st = stateFrom(r.u); if (hasFilter(st)) listing(st); else home(); }
  if (!route.first) route.first = 1; else window.scrollTo(0, 0);
}

/* ---------- search box ---------- */
function recent() { return ls.get('gl_rs', []); }
function addRecent(q) { q = q.trim(); if (!q) return; var r = recent().filter(function (x) { return x !== q; }); r.unshift(q); ls.set('gl_rs', r.slice(0, 5)); }
function sugShow() {
  var q = $('#q').value.trim(), ul = $('#sug'), h = '';
  sugList = []; sugI = -1;
  if (!q) { recent().forEach(function (r) { sugList.push({ q: r }); h += '<li role="option" data-i="' + (sugList.length - 1) + '">\uD83D\uDD52 ' + esc(r) + '</li>'; }); if (h) h = '<li class="h">Recent searches</li>' + h; }
  else {
    var sb = searchBase(q); lastQ = null;
    sb.list.slice().sort(function (a, b) { return sb.sc[b.key] - sb.sc[a.key]; }).slice(0, 6).forEach(function (p) {
      sugList.push({ k: p.key }); h += '<li role="option" data-i="' + (sugList.length - 1) + '"><img src="' + esc(p.image || FB) + '" alt=""><span>' + esc(p.name) + '<br><small>' + rs(p.price) + (p._sz ? ' \u00B7 ' + esc(p._sz) : '') + '</small></span></li>';
    });
    if (!h) h = '<li class="h">No matches yet. Press Search to try anyway.</li>';
  }
  ul.innerHTML = h; ul.hidden = !h; $('#q').setAttribute('aria-expanded', String(!!h));
}
function sugClose() { $('#sug').hidden = true; $('#q').setAttribute('aria-expanded', 'false'); }
function sugPick(i) { var s = sugList[i]; if (!s) return; sugClose(); if (s.k) { addRecent($('#q').value); location.hash = pHref(by[s.k]); } else { $('#q').value = s.q; submit(); } }
function submit() { var q = $('#q').value.trim(); sugClose(); if (!q) { location.hash = '#/?all=1'; return; } addRecent(q); lastQ = null; location.hash = '#/?q=' + encodeURIComponent(q); }

/* ---------- events ---------- */
function debounce(f, ms) { var t; return function () { clearTimeout(t); t = setTimeout(f, ms); }; }
$('#q').addEventListener('input', function () { $('#qc').hidden = !this.value; sugDeb(); });
var sugDeb = debounce(sugShow, 150);
$('#q').addEventListener('focus', sugShow);
$('#q').addEventListener('keydown', function (e) {
  var li = $('#sug').querySelectorAll('li[data-i]');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!li.length) return; e.preventDefault();
    sugI = (sugI + (e.key === 'ArrowDown' ? 1 : -1) + li.length) % li.length;
    li.forEach(function (x, i) { x.setAttribute('aria-selected', String(i === sugI)); });
  } else if (e.key === 'Enter' && sugI >= 0) { e.preventDefault(); sugPick(sugI); }
  else if (e.key === 'Escape') sugClose();
});
$('#sug').addEventListener('mousedown', function (e) { var li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); sugPick(+li.dataset.i); } });
document.addEventListener('click', function (e) { if (!e.target.closest('.sbox')) sugClose(); });
$('#sf').addEventListener('submit', function (e) { e.preventDefault(); submit(); });
$('#qc').addEventListener('click', function () { $('#q').value = ''; this.hidden = true; $('#q').focus(); sugShow(); if (cur().q) mutate(function (s) { s.q = ''; }); });

document.addEventListener('click', function (e) {
  var t = e.target, a = t.closest('[data-act]');
  if (a) { act(a.dataset.act, a.dataset.k); return; }
  if (t.closest('#cartbar')) { renderCart(); return; }
  if (t.closest('[data-close]') || t.id === 'bd') { closeUI(); $('#cartbar').focus(); return; }
  if (t.closest('[data-clear]')) {
    if (t.closest('#cart')) { if (confirm('Remove everything from your cart?')) { cart = {}; saveCart(); updateCart(); renderCart(); document.querySelectorAll('.ctl').forEach(function (el) { if (by[el.dataset.k]) el.innerHTML = ctlInner(by[el.dataset.k]); }); } }
    else location.hash = '#/?all=1';
    return;
  }
  var rm = t.closest('[data-rm]');
  if (rm) { var k = rm.dataset.rm, v = rm.dataset.v; mutate(function (s) { if (k === 'q') s.q = ''; else if (k === 'price') { s.min = ''; s.max = ''; } else if (k === 'stock' || k === 'offer') s[k] = false; else s[k] = s[k].filter(function (x) { return x !== v; }); }); return; }
  var pr = t.closest('[data-pr]'); if (pr) { var m = pr.dataset.pr.split('-'); mutate(function (s) { s.min = m[0] === '0' ? '' : m[0]; s.max = m[1]; }); return; }
  if (t.closest('[data-more]')) { var st = cur(); st.n += 24; location.hash = toHash(st); return; }
  if (t.closest('[data-fopen]')) { document.body.classList.add('fopen'); return; }
  if (t.closest('[data-fclose]')) { document.body.classList.remove('fopen'); window.scrollTo(0, 0); return; }
  if (t.closest('#helpb')) { openHelp(); return; }
});
document.addEventListener('change', function (e) {
  var t = e.target;
  if (t.dataset.f) { mutate(function (s) { var k = t.dataset.f; if (k === 'stock' || k === 'offer') s[k] = t.checked; else { var i = s[k].indexOf(t.value); if (t.checked && i < 0) s[k].push(t.value); else if (!t.checked && i >= 0) s[k].splice(i, 1); } }); }
  else if (t.id === 'sort') mutate(function (s) { s.sort = t.value; });
  else if (t.id === 'pmin' || t.id === 'pmax') mutate(function (s) { s.min = $('#pmin').value; s.max = $('#pmax').value; });
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!$('#cart').hidden || document.body.classList.contains('fopen')) closeUI(); } });
document.addEventListener('error', function (e) { var i = e.target; if (i && i.tagName === 'IMG' && !i.dataset.fb) { i.dataset.fb = 1; i.src = FB; } }, true);
window.addEventListener('hashchange', function () { if (P.length) route(); });

function openHelp() {
  var d = $('#help');
  d.innerHTML = '<h2>Need Help Ordering?</h2><ol><li>Search or tap a category.</li><li>Press <b>Add to Cart</b> on what you want.</li><li>Press the blue <b>Cart</b> bar at the bottom.</li><li>Check your items, then press <b>Continue to Checkout</b>.</li></ol><p>Or ask us directly and we will help you order:</p><p>' + callLink() + ' ' + waLink() + '</p><button class="btn pri" id="hc">Close</button>';
  d.showModal(); $('#hc').onclick = function () { d.close(); };
}
var lvl = ls.get('gl_txt', 1);
function applyText() { document.documentElement.style.fontSize = SIZES[lvl] + '%'; ls.set('gl_txt', lvl); }
$('#txtp').onclick = function () { lvl = Math.min(SIZES.length - 1, lvl + 1); applyText(); };
$('#txtm').onclick = function () { lvl = Math.max(0, lvl - 1); applyText(); };
applyText();
load();
})();
