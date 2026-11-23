(function () {
  var NUM = '919386181050', UPI = '9386181050@okbizaxis', PHYS = 100, PINHASH = 5533239574072353;
  function h53(str, seed) {
    var h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (var i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }
  var DEFAULT_BASE = location.origin + location.pathname;
  var SV = {
    janam: { n: 'Janam Kundli', p: 1099, k: 'birth' },
    milan: { n: 'Kundli Milan', p: 501, k: 'milan' },
    lal: { n: 'Lal Kitab Report', p: 2999, k: 'birth' },
    varsh: { n: 'Varshphal Report', p: 599, k: 'birth' }
  };
  var QRS = window.__QRS || {};
  var $ = function (id) { return document.getElementById(id); };
  function sget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /*P*/
  function cleanPhone(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
    if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
    return d;
  }
  function amountFor(key, delivery) { return SV[key] ? SV[key].p + (delivery === 'phys' ? PHYS : 0) : null; }
  function parseMsg(t) {
    var o = { persons: [], delivery: 'pdf', status: { confirmed: false, paid: false, printed: false } };
    var cp = null;
    String(t).split(/\r?\n/).forEach(function (raw) {
      var l = raw.replace(/[*_~]/g, '').trim();
      if (!l) return;
      var h = /^(boy|girl)?\s*details\s*:?$/i.exec(l);
      if (h) {
        var lab = h[1] ? h[1].charAt(0).toUpperCase() + h[1].slice(1).toLowerCase() : 'Details';
        cp = { label: lab }; o.persons.push(cp); return;
      }
      var kv = /^([A-Za-z ]+?)\s*:\s*(.*)$/.exec(l);
      if (!kv) return;
      var key = kv[1].toLowerCase().trim(), val = kv[2].trim();
      if (key === 'order id') o.id = val;
      else if (key === 'service') o.serviceName = val;
      else if (key === 'delivery') o.delivery = /physical/i.test(val) ? 'phys' : 'pdf';
      else if (key === 'amount') o.amount = parseInt(val.replace(/\D/g, ''), 10) || null;
      else if (key === 'address') o.address = val;
      else if (key === 'mobile') o.phone = cleanPhone(val);
      else if (key === 'name') { if (!cp) { cp = { label: 'Details' }; o.persons.push(cp); } cp.name = val; }
      else if (key === 'date of birth' && cp) cp.dob = val;
      else if (key === 'time of birth' && cp) cp.time = val;
      else if (key === 'place of birth' && cp) cp.place = val;
    });
    Object.keys(SV).forEach(function (k) { if (o.serviceName && SV[k].n.toLowerCase() === o.serviceName.toLowerCase()) o.service = k; });
    if (!o.amount && o.service) o.amount = amountFor(o.service, o.delivery);
    if (!o.phone && !o.persons.length) return null;
    if (!o.id) o.id = 'DP-' + Date.now().toString(36).slice(-5).toUpperCase();
    o.created = new Date().toISOString();
    return o;
  }
  /*PEND*/

  /* ---------- views ---------- */
  var unlocked = false;
  function show(v) {
    ['order', 'pay', 'owner'].forEach(function (n) { $('v-' + n).hidden = n !== v; });
    if (v !== 'owner') { unlocked = false; $('list').textContent = ''; $('pin').value = ''; $('pinerr').hidden = true; }
    $('v-owner').dataset.on = v === 'owner' ? '1' : '';
    try { window.scrollTo(0, 0); } catch (e) {}
  }
  function route() {
    var h = (location.hash || '').slice(1), m = /^pay-(\d{3,4})$/.exec(h);
    if (h === 'owner') { show('owner'); renderOwner(); }
    else if (m) { show('pay'); renderPay(m[1]); }
    else show('order');
  }
  window.addEventListener('hashchange', route);
  document.querySelectorAll('[data-go]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var n = a.getAttribute('data-go');
      try { location.hash = n; } catch (x) {}
      if (n === 'owner') { show('owner'); renderOwner(); } else show('order');
    });
  });

  /* ---------- order form ---------- */
  function opts(from, to, pad) {
    var h = '<option value="">--</option>';
    for (var i = from; i <= to; i++) { var s = pad && i < 10 ? '0' + i : '' + i; h += '<option value="' + s + '">' + s + '</option>'; }
    return h;
  }
  function personHTML(k) {
    return '<div class="person">' +
      '<h3 id="' + k + '_title">आपका विवरण</h3>' +
      '<div class="field"><label for="' + k + '_name">Full name (in English)</label><input type="text" id="' + k + '_name" autocomplete="name" placeholder="e.g. Rahul Kumar"></div>' +
      '<div id="' + k + '_birth" class="col" style="gap:14px">' +
        '<div class="field"><label for="' + k + '_dob">Date of birth</label><input type="date" id="' + k + '_dob"></div>' +
        '<div class="field"><span class="lbl" id="' + k + '_tl">Time of birth (with AM / PM)</span>' +
          '<div class="time" role="group" aria-labelledby="' + k + '_tl">' +
            '<select id="' + k + '_hh" aria-label="Hour">' + opts(1, 12, false) + '</select>' +
            '<select id="' + k + '_mm" aria-label="Minute">' + opts(0, 59, true) + '</select>' +
            '<select id="' + k + '_ap" aria-label="AM or PM"><option value="">AM/PM</option><option value="AM">AM</option><option value="PM">PM</option></select>' +
          '</div><span class="hint">सही समय न पता हो तो करीब का समय डालिए।</span></div>' +
        '<div class="field"><label for="' + k + '_place">Place of birth (in English)</label><input type="text" id="' + k + '_place" placeholder="Village / City, District, State"></div>' +
      '</div></div>';
  }
  $('p1').innerHTML = personHTML('a');
  $('p2').innerHTML = personHTML('b');
  var now = new Date();
  var iso = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  $('a_dob').max = iso; $('b_dob').max = iso;

  function svc() { return document.querySelector('input[name=svc]:checked').value; }
  function fmt() { return document.querySelector('input[name=fmt]:checked').value; }
  function amount() { return amountFor(svc(), fmt()); }
  function sync() {
    var s = SV[svc()], milan = s.k === 'milan';
    $('p2').hidden = !milan;
    $('a_title').textContent = milan ? 'वर (Boy) का विवरण' : 'आपका विवरण';
    $('b_title').textContent = 'वधू (Girl) का विवरण';
    $('addr').hidden = fmt() !== 'phys';
    $('total').textContent = '₹' + amount();
    $('totalsub').textContent = fmt() === 'phys' ? 'PDF + छपी हुई कॉपी (+₹100) · चर्चा शामिल' : 'PDF · चर्चा शामिल';
  }
  document.querySelectorAll('input[name=svc], input[name=fmt]').forEach(function (r) { r.addEventListener('change', sync); });
  sync();

  function ids(k) { return ['name', 'dob', 'hh', 'mm', 'ap', 'place'].map(function (x) { return k + '_' + x; }); }
  function fmtDate(v) { var p = v.split('-'); return p[2] + '-' + p[1] + '-' + p[0]; }
  function validate() {
    var bad = [], keys = SV[svc()].k === 'milan' ? ['a', 'b'] : ['a'];
    document.querySelectorAll('[aria-invalid]').forEach(function (e) { e.removeAttribute('aria-invalid'); });
    keys.forEach(function (k) { ids(k).forEach(function (id) { var e = $(id); if (!e.value.trim()) { e.setAttribute('aria-invalid', 'true'); bad.push(e); } }); });
    if (fmt() === 'phys' && !$('addr_t').value.trim()) { $('addr_t').setAttribute('aria-invalid', 'true'); bad.push($('addr_t')); }
    var ph = $('phone');
    if (!/^[6-9]\d{9}$/.test(cleanPhone(ph.value))) { ph.setAttribute('aria-invalid', 'true'); bad.push(ph); }
    return bad;
  }
  function personText(k, head) {
    return head + '\nName: ' + $(k + '_name').value.trim() +
      '\nDate of birth: ' + fmtDate($(k + '_dob').value) +
      '\nTime of birth: ' + $(k + '_hh').value + ':' + $(k + '_mm').value + ' ' + $(k + '_ap').value +
      '\nPlace of birth: ' + $(k + '_place').value.trim();
  }
  var orderId = 'DP-' + Date.now().toString(36).slice(-5).toUpperCase();
  function buildMsg() {
    var s = SV[svc()], phys = fmt() === 'phys';
    var t = 'Namaste Pandit ji, I want to order from Destiny Point.\n' +
      'Order ID: ' + orderId + '\n' +
      'Service: ' + s.n + '\n' +
      'Delivery: ' + (phys ? 'PDF + Physical copy (+Rs 100)' : 'PDF') + '\n' +
      'Amount: Rs ' + amount() + '\n\n';
    if (s.k === 'milan') t += personText('a', 'Boy details') + '\n\n' + personText('b', 'Girl details');
    else t += personText('a', 'Details');
    if (phys) t += '\n\nAddress: ' + $('addr_t').value.trim().replace(/\s*\n\s*/g, ', ');
    t += '\n\nMobile: ' + cleanPhone($('phone').value);
    return t;
  }
  var send = $('send');
  send.addEventListener('click', function (e) {
    var bad = validate(), err = $('err');
    if (bad.length) {
      e.preventDefault();
      err.hidden = false;
      err.textContent = 'कृपया लाल निशान वाली जानकारी भरिए। मोबाइल नंबर 10 अंकों का होना चाहिए।';
      bad[0].focus();
      return;
    }
    err.hidden = true;
    var msg = buildMsg();
    send.href = 'https://wa.me/' + NUM + '?text=' + encodeURIComponent(msg);
    $('msg').value = msg;
    $('preview').hidden = false;
  });
  function copyTo(text, flag, okText, failText) {
    try { navigator.clipboard.writeText(text).then(function () { flag(okText); }, function () { flag(failText); }); }
    catch (x) { flag(failText); }
  }
  $('copy').addEventListener('click', function () {
    var ta = $('msg'); ta.focus(); ta.select();
    copyTo(ta.value, function (m) { $('copied').textContent = m; }, 'कॉपी हो गया।', 'कॉपी नहीं हुआ। संदेश को दबाकर चुनिए और कॉपी कीजिए।');
  });
  function btnFlash(b, okText, failText, text) {
    var orig = b.textContent;
    copyTo(text, function (m) { b.textContent = m; }, okText, failText);
    setTimeout(function () { b.textContent = orig; }, 2500);
  }
  $('copynum').addEventListener('click', function () { btnFlash($('copynum'), 'कॉपी हो गया', 'नंबर दबाकर चुनिए', '9386181050'); });
  $('gemlink').href = 'https://wa.me/' + NUM + '?text=' + encodeURIComponent('Namaste Pandit ji, I want information about genuine gemstones.');
  $('f').addEventListener('submit', function (e) { e.preventDefault(); });

  /* ---------- payment page ---------- */
  function renderPay(a) {
    var ok = !!QRS[a];
    $('payok').hidden = !ok; $('payerr').hidden = ok;
    if (!ok) return;
    $('payamt').textContent = '₹' + a;
    $('payqr').innerHTML = QRS[a];
    $('upiopen').href = 'upi://pay?pa=' + UPI + '&pn=Destiny%20Point&am=' + a + '.00&cu=INR&tn=Destiny%20Point';
  }
  $('copyupi').addEventListener('click', function () { btnFlash($('copyupi'), 'कॉपी हो गया', 'ID दबाकर चुनिए', UPI); });

  /* ---------- owner desk ---------- */
  var orders = [], filter = 'all', openQR = {};
  function load() {
    try { orders = JSON.parse(sget('dp_orders_v1') || '[]'); if (!Array.isArray(orders)) orders = []; } catch (e) { orders = []; }
  }
  function save() { $('warn').hidden = sset('dp_orders_v1', JSON.stringify(orders)); }
  function base() { return sget('dp_base') || DEFAULT_BASE; }
  function qrAmount(o) {
    if (o.amount && QRS[o.amount]) return o.amount;
    var a = amountFor(o.service, o.delivery);
    return a && QRS[a] ? a : null;
  }
  function custName(o) { return (o.persons[0] && o.persons[0].name) || 'Customer'; }
  function qrOn() { return sget('dp_qr') === '1'; }
  function payMsg(o) {
    var a = qrAmount(o);
    if (!qrOn() || !a) {
      return 'Namaste ' + custName(o) + ', your Destiny Point order is confirmed.\n' +
        'Order ID: ' + o.id + '\n' +
        'Service: ' + (o.serviceName || '') + '\n\n' +
        'Pandit ji will share the payment details with you. Please pay only after this confirmation.\n- Dr. Hardev Kashyap, Destiny Point';
    }
    return 'Namaste ' + custName(o) + ', your Destiny Point order is confirmed.\n' +
      'Order ID: ' + o.id + '\n' +
      'Service: ' + (o.serviceName || '') + '\n' +
      (a ? 'Amount: Rs ' + a + '\n\n' : '\n') +
      'Please pay using this link (it shows the QR and UPI ID):\n' + base() + (a ? '#pay-' + a : '') + '\n\n' +
      'UPI ID: ' + UPI + '\n' +
      'After payment, please send the screenshot here.\n- Dr. Hardev Kashyap, Destiny Point';
  }
  function badge(txt, on, cls) { return el('span', 'badge' + (on ? ' on' : '') + (cls ? ' ' + cls : ''), txt); }
  function tog(label, pressed, fn) {
    var b = el('button', 'tog', label); b.type = 'button'; b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.addEventListener('click', fn); return b;
  }
  function card(o) {
    var c = el('article', 'order');
    var top = el('div', 'top');
    top.appendChild(el('span', 'oid', o.id));
    var w = ''; try { w = new Date(o.created).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) {}
    top.appendChild(el('span', 'when', w));
    c.appendChild(top);
    c.appendChild(el('div', 'what', (o.serviceName || 'Order') + (o.amount ? ' · ₹' + o.amount : '')));
    var names = o.persons.map(function (p) { return p.name; }).filter(Boolean).join(' & ');
    c.appendChild(el('div', 'who', (names || 'Name not found') + (o.phone ? ' · ' + o.phone : '')));
    var bd = el('div', 'badges');
    bd.appendChild(badge(o.delivery === 'phys' ? 'PDF + Physical' : 'PDF', false, o.delivery === 'phys' ? 'phys' : ''));
    bd.appendChild(badge(o.status.confirmed ? 'Confirmed' : 'New', o.status.confirmed));
    if (o.status.paid) bd.appendChild(badge('Paid', true));
    if (o.status.printed) bd.appendChild(badge('Printed', true));
    c.appendChild(bd);

    var dt = el('details'); dt.appendChild(el('summary', null, 'पूरी details'));
    var dl = el('dl');
    o.persons.forEach(function (p) {
      dl.appendChild(el('dt', 'pname', p.label || 'Details'));
      [['Name', p.name], ['Date of birth', p.dob], ['Time', p.time], ['Place', p.place]].forEach(function (r) {
        if (r[1]) { dl.appendChild(el('dt', null, r[0])); dl.appendChild(el('dd', null, r[1])); }
      });
    });
    if (o.address) { dl.appendChild(el('dt', null, 'Address')); dl.appendChild(el('dd', null, o.address)); }
    dt.appendChild(dl); c.appendChild(dt);

    var act = el('div', 'row');
    act.appendChild(tog('Order confirm', o.status.confirmed, function () { o.status.confirmed = !o.status.confirmed; save(); renderOwner(); }));
    act.appendChild(tog('Payment mila', o.status.paid, function () { o.status.paid = !o.status.paid; save(); renderOwner(); }));
    act.appendChild(tog('Print ho gaya', o.status.printed, function () { o.status.printed = !o.status.printed; save(); renderOwner(); }));
    c.appendChild(act);

    if (o.status.confirmed) {
      var pr = el('div', 'row');
      if (o.phone && /^\d{10}$/.test(o.phone)) {
        var a = el('a', 'btn sm', qrOn() ? 'ग्राहक को Payment QR भेजें (WhatsApp)' : 'ग्राहक को Confirm message भेजें (WhatsApp)');
        a.href = 'https://wa.me/91' + o.phone + '?text=' + encodeURIComponent(payMsg(o));
        a.target = '_blank'; a.rel = 'noopener'; pr.appendChild(a);
      } else {
        pr.appendChild(el('p', 'err', 'ग्राहक का मोबाइल नंबर 10 अंकों का नहीं मिला, इसलिए message का बटन नहीं बना।'));
      }
      if (qrOn()) {
        var qb = el('button', 'copy', openQR[o.id] ? 'QR छुपाएँ' : 'QR देखें'); qb.type = 'button';
        qb.addEventListener('click', function () { openQR[o.id] = !openQR[o.id]; renderOwner(); });
        pr.appendChild(qb);
      }
      c.appendChild(pr);
      if (qrOn() && openQR[o.id]) {
        var qa = qrAmount(o);
        if (qa) { var qw = el('div', 'qrwrap'); qw.innerHTML = QRS[qa]; c.appendChild(qw); c.appendChild(el('p', 'note', 'Amount: ₹' + qa + ' · UPI ID: ' + UPI)); }
        else c.appendChild(el('p', 'err', 'इस राशि का QR उपलब्ध नहीं है।'));
      }
    }

    var del = el('button', 'tog danger', 'ऑर्डर हटाएँ'); del.type = 'button';
    var armed = false;
    del.addEventListener('click', function () {
      if (!armed) { armed = true; del.textContent = 'पक्का हटाएँ?'; setTimeout(function () { armed = false; del.textContent = 'ऑर्डर हटाएँ'; }, 4000); return; }
      orders = orders.filter(function (x) { return x.id !== o.id; }); save(); renderOwner();
    });
    var dr = el('div', 'row'); dr.appendChild(del); c.appendChild(dr);
    return c;
  }
  function inFilter(o) {
    if (filter === 'new') return !o.status.confirmed;
    if (filter === 'confirmed') return o.status.confirmed && !o.status.printed;
    if (filter === 'printed') return o.status.printed;
    return true;
  }
  function renderOwner() {
    $('gate').hidden = unlocked; $('desk').hidden = !unlocked;
    if (!unlocked) return;
    $('qrsw').checked = qrOn(); $('qrstate').textContent = qrOn() ? 'चालू' : 'बंद';
    load();
    var cnt = { all: orders.length, new: 0, confirmed: 0, printed: 0 };
    orders.forEach(function (o) {
      if (!o.status.confirmed) cnt.new++;
      if (o.status.confirmed && !o.status.printed) cnt.confirmed++;
      if (o.status.printed) cnt.printed++;
    });
    var tabs = $('tabs'); tabs.textContent = '';
    [['all', 'सभी'], ['new', 'नए'], ['confirmed', 'Confirmed (print baaki)'], ['printed', 'Printed']].forEach(function (t) {
      var b = el('button', 'tab', t[1] + ' (' + cnt[t[0]] + ')'); b.type = 'button';
      b.setAttribute('aria-pressed', filter === t[0] ? 'true' : 'false');
      b.addEventListener('click', function () { filter = t[0]; renderOwner(); });
      tabs.appendChild(b);
    });
    var list = $('list'); list.textContent = '';
    var shown = orders.filter(inFilter);
    if (!shown.length) list.appendChild(el('p', 'note', orders.length ? 'इस filter में कोई ऑर्डर नहीं है।' : 'अभी कोई ऑर्डर नहीं है। ग्राहक का WhatsApp message ऊपर paste करके ऑर्डर जोड़िए।'));
    shown.forEach(function (o) { list.appendChild(card(o)); });
    $('base').value = base();
  }
  $('gate').addEventListener('submit', function (e) {
    e.preventDefault();
    if (h53('dp-salt:' + $('pin').value.trim(), 7) === PINHASH) { unlocked = true; $('pin').value = ''; $('pinerr').hidden = true; renderOwner(); }
    else { $('pinerr').hidden = false; }
  });
  $('lock').addEventListener('click', function () { unlocked = false; $('list').textContent = ''; renderOwner(); });
  $('qrsw').addEventListener('change', function () { sset('dp_qr', $('qrsw').checked ? '1' : '0'); renderOwner(); });
  $('addbtn').addEventListener('click', function () {
    var t = $('paste').value.trim(), er = $('adderr'), ok = $('addok');
    er.hidden = true; ok.hidden = true;
    if (!t) { er.textContent = 'पहले message paste कीजिए।'; er.hidden = false; return; }
    load();
    if (t.charAt(0) === '[') {
      try {
        var arr = JSON.parse(t), added = 0;
        arr.forEach(function (o) {
          if (o && o.id && Array.isArray(o.persons) && o.status && !orders.some(function (x) { return x.id === o.id; })) { orders.push(o); added++; }
        });
        orders.sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); });
        save(); renderOwner(); $('paste').value = '';
        ok.textContent = added + ' ऑर्डर वापस जोड़े गए।'; ok.hidden = false;
      } catch (x) { er.textContent = 'Backup पढ़ा नहीं जा सका।'; er.hidden = false; }
      return;
    }
    var o = parseMsg(t);
    if (!o) { er.textContent = 'यह message समझ नहीं आया। ग्राहक का पूरा WhatsApp message paste कीजिए।'; er.hidden = false; return; }
    if (orders.some(function (x) { return x.id === o.id; })) { er.textContent = 'यह ऑर्डर (' + o.id + ') पहले से जुड़ा हुआ है।'; er.hidden = false; return; }
    orders.unshift(o); save(); renderOwner(); $('paste').value = '';
    ok.textContent = 'ऑर्डर ' + o.id + ' जुड़ गया।'; ok.hidden = false;
  });
  $('bk').addEventListener('click', function () {
    load(); var m = $('bkmsg');
    copyTo(JSON.stringify(orders), function (x) { m.textContent = x; }, 'Backup कॉपी हो गया।', 'कॉपी नहीं हुआ।');
  });
  $('base').addEventListener('change', function () { var v = $('base').value.trim(); if (v) sset('dp_base', v.replace(/#.*$/, '')); });

  route();
})();
