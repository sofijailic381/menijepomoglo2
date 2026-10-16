/* Meni je pomoglo · ACNE ELIMINATOR — interakcije (čist JavaScript, bez biblioteka) */
(function () {
  'use strict';

  /* ===== Podešavanja ===== */
  const CONFIG = {
    defaultBundle: 'set2',   // paket u sticky traci i futeru: 'set1' | 'set2' | 'set3'
    stickyBar: true,         // traka za kupovinu kad hero nestane sa ekrana
    freeShippingFrom: 6000,  // RSD
    checkoutUrl: '',         // npr. 'https://www.menijepomoglo.rs/placanje/' — prazno = demo poruka
    newsletterEndpoint: '',  // npr. Formspree / MailerLite URL — prazno = samo poruka zahvalnosti
    storageKey: 'mjp-korpa'
  };

  const IMG = 'assets/img/proizvodi/';
  const PRODUCTS = {
    set1:  { name: 'ACNE ELIMINATOR Set', desc: '1 pakovanje · 90 dana', price: 3990, reg: 6250, img: IMG + 'set.webp' },
    set2:  { name: 'ACNE ELIMINATOR Set', desc: '2 pakovanja · 180 dana', price: 6990, reg: 12500, img: IMG + 'set.webp' },
    set3:  { name: 'ACNE ELIMINATOR Set', desc: '3 pakovanja · 270 dana', price: 8990, reg: 18750, img: IMG + 'set.webp' },
    sos:   { name: 'SOS formula', desc: 'Tretman preko noći · do 365 dana', price: 1990, reg: 2990, img: IMG + 'sos-formula.webp' },
    gel:   { name: 'Micelarna umivalica', desc: 'Sa aloe verom · 90 dana', price: 1290, reg: 1990, img: IMG + 'umivalica.webp' },
    mask:  { name: 'Maska sa sumporom', desc: 'Mikronizovani sumpor · 90 dana', price: 2290, reg: 3550, img: IMG + 'maska.webp' },
    cream: { name: 'Krema sa niacinamidom', desc: 'Hidratantna · 90 dana', price: 1690, reg: 2550, img: IMG + 'krema.webp' }
  };
  const RESULTS = {
    sos:   { name: 'SOS formula', price: 1990, reg: 2990, add: ['sos'] },
    set:   { name: 'ACNE ELIMINATOR Set', price: 3990, reg: 6250, add: ['set1'] },
    combo: { name: 'Set + SOS formula', price: 5980, reg: 9240, add: ['set1', 'sos'] }
  };
  const SKIN = {
    oily: 'Za masnu kožu ključna je kontrola sebuma bez isušivanja.',
    mixed: 'Mešovita koža traži dubinsko čišćenje T-zone bez isušivanja obraza.',
    sensitive: 'Formule su prilagođene osetljivoj koži — nežne prema koži, nemilosrdne prema bubuljicama.',
    dry: 'Maska čisti pore bez isušivanja, a krema vraća vlagu koja ti nedostaje.'
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const rsd = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' RSD';
  const plural = n => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? 'artikal' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'artikla' : 'artikala'; };
  const setText = (sel, t) => $$(sel).forEach(el => { el.textContent = t; });

  /* ===== Korpa ===== */
  const cartEl = $('#korpa'), overlay = $('.cart-overlay'), itemsEl = $('[data-cart-items]'), tpl = $('#cart-item');
  let cart = load(), cartOpen = false, lastFocus = null;

  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]');
      return Array.isArray(v) ? v.filter(x => x && PRODUCTS[x.id] && x.q > 0) : [];
    } catch (e) { return []; }
  }
  function save() { try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(cart)); } catch (e) { /* privatni režim */ } }

  function add(ids, open = true) {
    [].concat(ids).forEach(id => {
      if (id === 'bundle') id = CONFIG.defaultBundle;
      if (!PRODUCTS[id]) return;
      const it = cart.find(x => x.id === id);
      if (it) it.q += 1; else cart.push({ id, q: 1 });
    });
    save(); renderCart();
    if (open) openCart();
  }
  function setQty(id, d) {
    cart = cart.map(x => (x.id === id ? { id: x.id, q: x.q + d } : x)).filter(x => x.q > 0);
    save(); renderCart();
  }

  function renderCart() {
    const sub = cart.reduce((a, x) => a + PRODUCTS[x.id].price * x.q, 0);
    const reg = cart.reduce((a, x) => a + PRODUCTS[x.id].reg * x.q, 0);
    const count = cart.reduce((a, x) => a + x.q, 0);
    const left = Math.max(0, CONFIG.freeShippingFrom - sub);
    const hasSos = cart.some(x => x.id === 'sos');
    const hasSet = cart.some(x => x.id.indexOf('set') === 0);

    setText('[data-cart-count]', String(count));
    $$('[data-cart-open]').forEach(el => el.setAttribute('aria-label', count ? `Korpa, ${count} ${plural(count)}` : 'Korpa, prazna'));
    setText('[data-ship-msg]', count === 0 ? `Besplatna dostava za porudžbine iznad ${rsd(CONFIG.freeShippingFrom)}` : left === 0 ? 'Dostava je besplatna ✓' : `Još ${rsd(left)} do besplatne dostave`);
    $('[data-ship-bar]').style.width = Math.min(100, Math.round(sub / CONFIG.freeShippingFrom * 100)) + '%';
    $('[data-cart-empty]').hidden = count > 0;

    // zadrži fokus na +/− dugmetu posle ponovnog iscrtavanja
    const f = document.activeElement;
    const fItem = f && f.closest ? f.closest('.cart-item') : null;
    const fId = fItem ? fItem.dataset.id : null, fDir = fItem ? f.dataset.qty : null;

    itemsEl.replaceChildren(...cart.map(x => {
      const p = PRODUCTS[x.id], li = tpl.content.firstElementChild.cloneNode(true);
      li.dataset.id = x.id;
      $('img', li).src = p.img;
      $('.cart-item__name', li).textContent = p.name;
      $('.cart-item__desc', li).textContent = p.desc;
      $('.qty__n', li).textContent = x.q;
      $('.cart-item__total', li).textContent = rsd(p.price * x.q);
      $('.cart-item__reg', li).textContent = rsd(p.reg * x.q);
      return li;
    }));
    if (fId && fDir) {
      const b = $(`.cart-item[data-id="${fId}"] [data-qty="${fDir}"]`, itemsEl);
      (b || $('.cart__close')).focus();
    }

    $('[data-upsell="sos"]').hidden = !(hasSet && !hasSos);
    $('[data-upsell="set"]').hidden = !(!hasSet && count > 0);
    setText('[data-cart-subtotal]', rsd(sub));
    $('[data-cart-savings-row]').hidden = !(reg > sub);
    setText('[data-cart-savings]', '−' + rsd(reg - sub));
    setText('[data-cart-shipping]', count === 0 ? '—' : left === 0 ? 'Besplatna' : 'Obračunava se na plaćanju');
    $('[data-checkout]').disabled = count === 0;
    $('[data-checkout-note]').hidden = true;
  }

  function openCart() {
    if (cartOpen) return;
    cartOpen = true;
    lastFocus = document.activeElement;
    cartEl.hidden = false; overlay.hidden = false;
    document.documentElement.classList.add('is-locked');
    $('.cart__close').focus();
    updateSticky();
  }
  function closeCart() {
    if (!cartOpen) return;
    cartOpen = false;
    cartEl.hidden = true; overlay.hidden = true;
    document.documentElement.classList.remove('is-locked');
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    updateSticky();
  }
  function checkout() {
    if (!cart.length) return;
    if (CONFIG.checkoutUrl) { window.location.href = CONFIG.checkoutUrl; return; }
    $('[data-checkout-note]').hidden = false;
  }

  // fokus ostaje unutar otvorene korpe
  cartEl.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = $$('button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])', cartEl).filter(el => !el.closest('[hidden]'));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && cartOpen) closeCart(); });

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-add],[data-add-quiet],[data-cart-open],[data-cart-close],[data-qty],[data-checkout]');
    if (!t) return;
    if (t.dataset.add) add(t.dataset.add);
    else if (t.dataset.addQuiet) add(t.dataset.addQuiet, false);
    else if (t.hasAttribute('data-cart-open')) openCart();
    else if (t.hasAttribute('data-cart-close')) closeCart();
    else if (t.dataset.qty) setQty(t.closest('.cart-item').dataset.id, Number(t.dataset.qty));
    else if (t.hasAttribute('data-checkout')) checkout();
  });

  /* ===== Paket u sticky traci i futeru ===== */
  const bundle = PRODUCTS[CONFIG.defaultBundle] || PRODUCTS.set2;
  setText('[data-bundle-price]', rsd(bundle.price));
  setText('[data-bundle-label]', bundle.desc);

  /* ===== Sticky traka ===== */
  const sticky = $('[data-sticky]'), hero = $('[data-hero]');
  let pastHero = false;
  function updateSticky() { if (sticky) sticky.hidden = !(CONFIG.stickyBar && pastHero && !cartOpen); }
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      pastHero = !en.isIntersecting && en.boundingClientRect.bottom < 0;
      updateSticky();
    }).observe(hero);
  }

  /* ===== Kviz ===== */
  const quiz = $('[data-quiz]');
  if (quiz) {
    const st = { step: 0, a1: null, a2: null, a3: null };
    const steps = $$('[data-quiz-step]', quiz), result = $('[data-quiz-result]', quiz);
    const label = $('[data-quiz-label]', quiz), bar = $('[data-quiz-bar]', quiz), back = $('[data-quiz-back]', quiz);
    const kindOf = () => (st.a1 === 'spot' && st.a2 !== 'years' ? 'sos' : st.a1 === 'inflamed' ? 'combo' : 'set');
    const why = kind => {
      const skin = SKIN[st.a3] || '';
      if (kind === 'sos') return 'Za bubuljice koje iskoče s vremena na vreme ne treba ti cela rutina — treba ti precizan tretman koji deluje preko noći. Ako počnu češće da se vraćaju, Set rešava uzrok.';
      if (kind === 'combo') return ('Upaljene i potkožne bubuljice traže dva nivoa nege: rutinu koja sprečava nove i SOS formulu koja preko noći smiruje postojeće. ' + skin).trim();
      return (skin + ' Rutina u 3 koraka deluje na sve uzroke akni: čisti pore, kontroliše sebum, gasi bakterije i smiruje upalu.' + (st.a2 === 'years' ? ' Akne koje traju godinama ne prolaze same od sebe — zato pakovanje traje 90 dana.' : '')).trim();
    };
    const render = focus => {
      const done = st.step >= 3;
      steps.forEach((el, i) => { el.hidden = i !== st.step; });
      result.hidden = !done;
      label.textContent = done ? 'Tvoja preporuka je spremna' : `Pitanje ${st.step + 1} od 3`;
      bar.style.width = (done ? 100 : Math.max(6, Math.round(st.step / 3 * 100))) + '%';
      back.hidden = !(st.step > 0 && !done);
      $$('[data-q]', quiz).forEach(b => b.setAttribute('aria-pressed', String(st[b.dataset.q] === b.dataset.v)));
      if (done) {
        const k = kindOf(), r = RESULTS[k];
        $$('[data-res-visual]', quiz).forEach(el => { el.hidden = el.dataset.resVisual !== k; });
        $('[data-res-name]', quiz).textContent = r.name;
        $('[data-res-price]', quiz).textContent = rsd(r.price);
        $('[data-res-old]', quiz).textContent = rsd(r.reg);
        $('[data-res-why]', quiz).textContent = why(k);
      }
      if (focus) {
        const h = done ? $('[data-res-name]', quiz) : $('.quiz__q', steps[st.step]);
        if (h) h.focus({ preventScroll: true });
      }
    };
    quiz.addEventListener('click', e => {
      const opt = e.target.closest('[data-q]');
      if (opt) { st[opt.dataset.q] = opt.dataset.v; st.step += 1; render(true); return; }
      if (e.target.closest('[data-quiz-back]')) { st.step = Math.max(0, st.step - 1); render(true); return; }
      if (e.target.closest('[data-quiz-reset]')) { Object.assign(st, { step: 0, a1: null, a2: null, a3: null }); render(true); return; }
      if (e.target.closest('[data-res-add]')) add(RESULTS[kindOf()].add);
    });
    render(false);
  }

  /* ===== Newsletter ===== */
  const nl = $('[data-newsletter]');
  if (nl) {
    nl.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = $('[data-newsletter-msg]', nl), btn = $('button', nl);
      const show = t => { msg.textContent = t; msg.hidden = false; };
      if (!CONFIG.newsletterEndpoint) {
        console.info('[newsletter] CONFIG.newsletterEndpoint nije podešen — prijava se nigde ne šalje.');
        nl.reset(); show('Hvala na prijavi!'); return;
      }
      btn.disabled = true;
      try {
        const r = await fetch(CONFIG.newsletterEndpoint, { method: 'POST', body: new FormData(nl), headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(String(r.status));
        nl.reset(); show('Hvala na prijavi! Proveri inbox.');
      } catch (err) {
        show('Prijava nije uspela. Pokušaj ponovo za koji trenutak.');
      } finally { btn.disabled = false; }
    });
  }

  renderCart();
})();
