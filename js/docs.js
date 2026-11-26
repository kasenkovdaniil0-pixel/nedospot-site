/* NedoSpot — страницы документов: тема, язык, оглавление, прогресс чтения. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var themeMeta = document.querySelector('meta[name=theme-color]');

  function store(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }

  /* ---------------- Тема: круг расходится от кнопки ---------------- */
  function applyTheme(t) {
    if (t === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    if (themeMeta) themeMeta.content = t === 'light' ? '#f6f2eb' : '#050505';
    store('ns-theme', t);
    labelTheme();
  }
  function labelTheme() {
    var light = root.getAttribute('data-theme') === 'light';
    var en = root.getAttribute('data-lang') === 'en';
    var text = light ? (en ? 'Switch to dark theme' : 'Включить тёмную тему')
                     : (en ? 'Switch to light theme' : 'Включить светлую тему');
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.setAttribute('aria-label', text);
      b.title = text;
    });
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';

      if (reduce.matches) { applyTheme(next); return; }

      if (!document.startViewTransition) {
        root.classList.add('theme-fade');
        applyTheme(next);
        setTimeout(function () { root.classList.remove('theme-fade'); }, 400);
        return;
      }

      var r = btn.getBoundingClientRect();
      var x = r.left + r.width / 2;
      var y = r.top + r.height / 2;
      var R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

      root.classList.add('theme-vt');
      var vt = document.startViewTransition(function () { applyTheme(next); });
      vt.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + R + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 560, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(function () {});
      vt.finished.catch(function () {}).then(function () { root.classList.remove('theme-vt'); });
    });
  });

  /* ---------------- Язык ---------------- */
  var langBox = document.querySelector('[data-lang-box]');
  var langBtn = langBox && langBox.querySelector('.lang-btn');

  function openLang(open) {
    if (!langBox) return;
    langBox.classList.toggle('open', open);
    langBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function markLang() {
    var cur = root.getAttribute('data-lang');
    document.querySelectorAll('[data-set-lang]').forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-set-lang') === cur ? 'true' : 'false');
    });
  }
  function applyLang(l) {
    root.setAttribute('data-lang', l);
    root.lang = l;
    document.title = root.getAttribute('data-title-' + l) || document.title;
    store('ns-lang', l);
    markLang();
    labelTheme();
    // ?lang=… в адресе больше не нужен — выбор запомнен
    if (location.search.indexOf('lang=') > -1 && history.replaceState) {
      history.replaceState(null, '', location.pathname + location.hash);
    }
    spy.refresh();
  }
  function switchLang(l) {
    openLang(false);
    if (l === root.getAttribute('data-lang')) return;
    if (reduce.matches) { var i0 = spy.current(); applyLang(l); spy.jump(i0); return; }
    var at = spy.current();
    root.classList.add('lang-swap');
    setTimeout(function () {
      applyLang(l);
      spy.jump(at);
      requestAnimationFrame(function () { root.classList.remove('lang-swap'); });
    }, 180);
  }

  if (langBox) {
    langBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openLang(!langBox.classList.contains('open'));
    });
    langBox.querySelectorAll('[data-set-lang]').forEach(function (b) {
      b.addEventListener('click', function () { switchLang(b.getAttribute('data-set-lang')); });
    });
    document.addEventListener('click', function (e) {
      if (!langBox.contains(e.target)) openLang(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && langBox.classList.contains('open')) { openLang(false); langBtn.focus(); }
    });
  }

  /* ---------------- Прогресс чтения + «сейчас играет» в оглавлении ---------------- */
  var bar = document.querySelector('.progress i');

  var spy = (function () {
    var sections = [], links = [], toc = null, cntEl = null, curEl = null, active = -1;

    function visibleBlock() {
      var l = root.getAttribute('data-lang');
      return document.querySelector('main [data-l="' + l + '"]');
    }
    function refresh() {
      var block = visibleBlock();
      sections = block ? Array.prototype.slice.call(block.querySelectorAll('.dsec')) : [];
      links = block ? Array.prototype.slice.call(block.querySelectorAll('.trk')) : [];
      toc = block ? block.querySelector('.toc') : null;
      cntEl = block ? block.querySelector('[data-toc-cnt]') : null;
      curEl = block ? block.querySelector('[data-toc-cur]') : null;
      active = -1;
      update();
    }
    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - innerHeight;
      if (bar) bar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
      if (!sections.length) return;

      var line = innerHeight * 0.3;
      var idx = 0;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top - line <= 0) idx = i;
      }
      if (scrollY >= max - 2) idx = sections.length - 1; // долистали до конца
      if (idx === active) return;
      active = idx;
      links.forEach(function (a, j) {
        a.classList.toggle('is-on', j === idx);
        if (j === idx) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      var n = sections.length;
      if (cntEl) cntEl.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
      if (curEl && links[idx]) curEl.textContent = links[idx].querySelector('.tt').textContent;
      // в длинном оглавлении держим активный пункт на виду
      if (toc && links[idx] && innerWidth > 1023) {
        var t = toc.getBoundingClientRect(), a = links[idx].getBoundingClientRect();
        if (a.top < t.top + 60 || a.bottom > t.bottom - 10) toc.scrollTop += a.top - t.top - 80;
      }
    }
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; update(); });
    }
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    /* при смене языка остаёмся в том же разделе */
    function current() { return active; }
    function jump(i) {
      if (i > 0 && sections[i]) {
        var top = sections[i].getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(root).scrollPaddingTop) || 0);
        window.scrollTo({ top: top, behavior: 'instant' });
        update();
      }
    }
    return { refresh: refresh, current: current, jump: jump };
  })();

  /* Оглавление на телефоне — сворачивается в строку */
  document.querySelectorAll('.toc').forEach(function (toc) {
    var btn = toc.querySelector('.toc-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = !toc.classList.contains('open');
      toc.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    toc.querySelectorAll('.trk').forEach(function (a) {
      a.addEventListener('click', function () {
        toc.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  });

  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  markLang();
  labelTheme();
  spy.refresh();
})();
