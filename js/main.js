/*
 * NedoSpot — сайт: навигация, появление при прокрутке, демонстрации возможностей,
 * витрина интерфейса и просмотр скриншотов.
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var RELEASES = 'https://github.com/kasenkovdaniil0-pixel/NedoSpot-releases/releases';
  var RELEASES_API = 'https://api.github.com/repos/kasenkovdaniil0-pixel/NedoSpot-releases/releases/latest';

  // Вызывает onEnter/onLeave, когда элемент появляется/пропадает с экрана
  function watch(el, onEnter, onLeave, margin) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { onEnter(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) onEnter(); else if (onLeave) onLeave();
      });
    }, { rootMargin: margin || '0px' }).observe(el);
  }

  // Повторяющийся таймер, который работает, только пока блок виден
  function loopWhileVisible(el, fn, ms) {
    var id = 0;
    watch(el, function () {
      if (id) return;
      fn();
      id = setInterval(fn, ms);
    }, function () {
      clearInterval(id);
      id = 0;
    });
  }

  /* ---------- Цветы ---------- */

  var fields = window.NedoSpotFlowers = []; // для отладки из консоли
  var heroCanvas = $('.hero-canvas');
  if (heroCanvas && heroCanvas.getContext && window.FlowerField) {
    fields[0] = new window.FlowerField(heroCanvas, {
      density: 1,
      horizon: 0.46,
      clearZone: { x: 0.5, y: 0.42, rx: 0.3, ry: 0.2 }
    }).start();
  }
  var installCanvas = $('.install-canvas');
  if (installCanvas && installCanvas.getContext && window.FlowerField) {
    var installField = null;
    watch(installCanvas, function () {
      if (installField) return;
      installField = fields[1] = new window.FlowerField(installCanvas, {
        density: 0.55,
        horizon: 0.6,
        floaters: 0.1,
        scrollParallax: 0,
        clearZone: { x: 0.5, y: 0.45, rx: 0.32, ry: 0.22 }
      }).start();
      requestAnimationFrame(function () { installCanvas.classList.add('on'); });
    }, null, '400px');
  }

  if (!finePointer) {
    var hint = $('[data-hint]');
    if (hint) hint.textContent = 'Коснись цветов';
  }

  /* ---------- Заголовок NedoSpot по буквам ---------- */

  $$('[data-letters]').forEach(function (el) {
    var text = el.textContent;
    el.textContent = '';
    for (var i = 0; i < text.length; i++) {
      var s = doc.createElement('span');
      s.className = 'ch';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i);
      s.textContent = text[i];
      el.appendChild(s);
    }
  });

  /* ---------- Разбивка заголовков на слова ---------- */

  function splitWords(el) {
    var i = 0;
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/( +)/);
          var frag = doc.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^ +$/.test(p)) { frag.appendChild(doc.createTextNode(' ')); return; }
            var w = doc.createElement('span');
            w.className = 'w';
            var inner = doc.createElement('span');
            inner.style.setProperty('--i', i++);
            inner.textContent = p;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    }
    walk(el);
  }
  $$('[data-split]').forEach(splitWords);

  /* ---------- Появление при прокрутке ---------- */

  var revealEls = $$('[data-reveal], [data-split]');
  if ('IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          rio.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { rio.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Старт главного экрана ---------- */

  function ready() { doc.body.classList.add('ready'); }
  var fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 900); })]).then(function () {
    requestAnimationFrame(function () { requestAnimationFrame(ready); });
  });

  /* ---------- Навигация ---------- */

  var nav = $('#nav');
  var burger = $('.burger');
  var menu = $('#mobile-menu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    doc.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth > 820 && menu.classList.contains('open')) setMenu(false); });
  }

  // активный пункт меню
  var navLinks = $$('.nav-links a');
  if ('IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['top', 'features', 'interface', 'advantages', 'faq', 'download'].forEach(function (id) {
      var s = doc.getElementById(id);
      if (s) sio.observe(s);
    });
  }

  /* ---------- Реакция на курсор: подсветка блоков и «магнитные» кнопки ---------- */

  if (finePointer) {
    $$('[data-spot]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    if (!reduced) {
      $$('[data-magnetic]').forEach(function (el) {
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          var x = e.clientX - (r.left + r.width / 2);
          var y = e.clientY - (r.top + r.height / 2);
          el.style.transform = 'translate(' + (x * 0.16).toFixed(1) + 'px,' + (y * 0.28).toFixed(1) + 'px)';
        });
        el.addEventListener('pointerleave', function () { el.style.transform = ''; });
      });
    }
  }

  /* ---------- 01. Без рекламы ---------- */

  $$('[data-bars]').forEach(function (box) {
    var n = +box.getAttribute('data-bars');
    var right = box.classList.contains('r');
    for (var i = 0; i < n; i++) {
      var b = doc.createElement('i');
      b.className = 'b';
      var k = right ? i / n : 1 - i / n;
      var env = 0.35 + 0.65 * Math.abs(Math.sin(k * 5.2 + (right ? 1.3 : 0)));
      b.style.setProperty('--h', Math.round((22 + Math.random() * 78) * env) + '%');
      b.style.setProperty('--dl', (-Math.random() * 1.3).toFixed(2) + 's');
      box.appendChild(b);
    }
  });
  var ad = $('.ad');
  if (ad) {
    var adStep = 0;
    loopWhileVisible(ad.closest('.feat'), function () {
      // 0: показать → 1: зачеркнуть → 2: убрать → 3: пауза
      adStep = (adStep + 1) % 4;
      if (adStep === 1) { ad.classList.remove('gone', 'strike'); }
      if (adStep === 2) { ad.classList.add('strike'); }
      if (adStep === 3) { ad.classList.add('gone'); }
    }, 1500);
  }

  /* ---------- 02. Схема интерфейса ---------- */

  var wire = $('.wire');
  if (wire) {
    var parts = $$('.part[data-label]', wire);
    var hovered = false;
    var hlIdx = -1;
    wire.addEventListener('pointerenter', function () { hovered = true; parts.forEach(function (p) { p.classList.remove('hl'); }); });
    wire.addEventListener('pointerleave', function () { hovered = false; });
    loopWhileVisible(wire, function () {
      if (hovered) return;
      parts.forEach(function (p) { p.classList.remove('hl'); });
      hlIdx = (hlIdx + 1) % parts.length;
      parts[hlIdx].classList.add('hl');
    }, 1700);
  }

  /* ---------- 03. Библиотека: лайк ---------- */

  var like = $('.like');
  if (like) {
    like.addEventListener('click', function () {
      var on = like.getAttribute('aria-pressed') !== 'true';
      like.setAttribute('aria-pressed', on ? 'true' : 'false');
      $('[data-like-text]', like).textContent = on ? 'В любимых' : 'В любимые';
    });
  }

  /* ---------- 04. Живой текст ---------- */

  var lyrList = $('[data-lyrics]');
  if (lyrList) {
    var lines = $$('.lyr-line', lyrList);
    lines.forEach(function (ln) {
      var words = ln.textContent.split(' ');
      ln.textContent = '';
      words.forEach(function (w, i) {
        var s = doc.createElement('span');
        s.className = 'wd';
        s.textContent = w;
        ln.appendChild(s);
        if (i < words.length - 1) ln.appendChild(doc.createTextNode(' '));
      });
    });
    var cur = -1;
    var wordTimers = [];
    var lyrBox = lyrList.parentElement;
    var LINE_MS = 3200;
    var showLine = function () {
      wordTimers.forEach(clearTimeout);
      wordTimers = [];
      cur = (cur + 1) % lines.length;
      lines.forEach(function (ln, i) {
        ln.classList.toggle('cur', i === cur);
        ln.classList.toggle('done', i < cur);
        if (i !== cur) $$('.wd', ln).forEach(function (w) { w.classList.remove('lit'); });
      });
      var line = lines[cur];
      var y = line.offsetTop - (lyrBox.clientHeight * 0.46 - line.offsetHeight / 2);
      lyrList.style.transform = 'translate3d(0,' + (-y) + 'px,0)';
      var ws = $$('.wd', line);
      var step = (LINE_MS * 0.7) / ws.length;
      ws.forEach(function (w, i) {
        if (reduced) { w.classList.add('lit'); return; }
        wordTimers.push(setTimeout(function () { w.classList.add('lit'); }, 250 + i * step));
      });
    };
    loopWhileVisible(lyrBox, showLine, LINE_MS);
  }

  /* ---------- 05. Темы ---------- */

  var THEMES = [
    { n: 'Стекло', sw: 'linear-gradient(135deg,#f4efe6,#8e949e)', v: { bg: 'linear-gradient(135deg,#222226,#0c0c0e)', card: 'rgba(255,255,255,.07)', line: 'rgba(255,255,255,.14)', acc: '#f4efe6', acc2: '#8e949e', text: 'rgba(255,255,255,.85)' } },
    { n: 'Неон', sw: 'linear-gradient(135deg,#ff4fd8,#7a3cff)', v: { bg: 'radial-gradient(120% 100% at 15% 0%,#3b0d46,#12051a 65%)', card: 'rgba(255,79,216,.08)', line: 'rgba(255,79,216,.38)', acc: '#ff4fd8', acc2: '#7a3cff', text: '#ffe6fb' } },
    { n: 'Аврора', sw: 'linear-gradient(135deg,#8be3d6,#c08cff)', v: { bg: 'linear-gradient(135deg,#10302f,#1d1540 60%,#0e1020)', card: 'rgba(255,255,255,.06)', line: 'rgba(160,230,225,.26)', acc: '#8be3d6', acc2: '#c08cff', text: '#effffc' } },
    { n: 'Бумага', sw: '#efe9dc', v: { bg: '#efe9dc', card: 'rgba(31,27,22,.06)', line: 'rgba(31,27,22,.18)', acc: '#1f1b16', acc2: '#8a7f70', text: '#1f1b16' } }
  ];
  var mini = $('[data-mini]');
  var chipsBox = $('[data-chips]');
  if (mini && chipsBox) {
    var themeIdx = 0;
    var userPicked = false;
    var chips = THEMES.map(function (t, i) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.innerHTML = '<i style="--sw:' + t.sw + '"></i>' + t.n;
      b.addEventListener('click', function () { userPicked = true; applyTheme(i); });
      chipsBox.appendChild(b);
      return b;
    });
    var more = doc.createElement('span');
    more.className = 'chip';
    more.style.boxShadow = 'none';
    more.textContent = '+ ещё 3 темы';
    chipsBox.appendChild(more);
    var applyTheme = function (i) {
      themeIdx = i;
      var v = THEMES[i].v;
      mini.style.setProperty('--t-bg', v.bg);
      mini.style.setProperty('--t-card', v.card);
      mini.style.setProperty('--t-line', v.line);
      mini.style.setProperty('--t-acc', v.acc);
      mini.style.setProperty('--t-acc2', v.acc2);
      mini.style.setProperty('--t-text', v.text);
      chips.forEach(function (c, k) { c.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    };
    applyTheme(0);
    loopWhileVisible(mini, function () {
      if (userPicked || reduced) return;
      applyTheme((themeIdx + 1) % THEMES.length);
    }, 3000);
  }

  /* ---------- 06. Ранги ---------- */

  var RANKS = [
    { n: 'Железо', c: '#9aa0aa', g: 'rgba(200,205,215,.28)' },
    { n: 'Бронза', c: '#c99a7a', g: 'rgba(214,160,120,.3)' },
    { n: 'Серебро', c: '#d5dae2', g: 'rgba(225,230,240,.3)' },
    { n: 'Золото', c: '#ecd29a', g: 'rgba(240,210,140,.32)' },
    { n: 'Платина', c: '#bfe0e6', g: 'rgba(190,225,235,.3)' },
    { n: 'Алмаз', c: '#bcd2fb', g: 'rgba(180,205,255,.34)' },
    { n: 'Мастер', c: '#d6c3fa', g: 'rgba(210,190,255,.34)' },
    { n: 'Грандмастер', c: '#f5b9cb', g: 'rgba(245,185,205,.34)' },
    { n: 'Претендент', c: '#fff1c9', g: 'rgba(255,240,200,.4)' }
  ];
  var QUESTS = [
    { xp: 35, t: 'Задание: Создать плейлист' },
    { xp: 20, t: 'Задание: 3 трека в избранное' },
    { xp: 10, t: 'Достижение: Первый звук' }
  ];
  var badge = $('[data-badge]');
  if (badge) {
    var hex = $('.hex', badge);
    var rankName = $('[data-rank-name] span');
    var xpBar = $('[data-xp]');
    var xpText = $('[data-xp-text]');
    var toasts = $('[data-toasts]');
    var ladder = $('[data-ladder]');
    var rungs = RANKS.map(function () { var i = doc.createElement('i'); ladder.appendChild(i); return i; });
    var rank = 0, fill = 0, xpTotal = 0, q = 0;
    var paint = function () {
      var r = RANKS[rank];
      hex.setAttribute('fill', r.c);
      badge.style.setProperty('--rk-glow', r.g);
      rankName.textContent = r.n;
      rungs.forEach(function (el, i) { el.classList.toggle('on', i <= rank); });
      xpBar.style.width = fill + '%';
      xpText.textContent = 'опыт: ' + xpTotal;
    };
    paint();
    loopWhileVisible(badge, function () {
      var quest = QUESTS[q++ % QUESTS.length];
      xpTotal += quest.xp;
      var t = doc.createElement('span');
      t.className = 'xp-toast';
      t.innerHTML = '<b>+' + quest.xp + '</b> ' + quest.t;
      toasts.textContent = '';
      toasts.appendChild(t);
      fill += 22 + Math.random() * 16;
      if (fill >= 100) {
        xpBar.style.width = '100%';
        setTimeout(function () {
          rank = (rank + 1) % RANKS.length;
          if (rank === 0) xpTotal = 0;
          fill = 0;
          xpBar.style.transition = 'none';
          xpBar.style.width = '0%';
          void xpBar.offsetWidth;
          xpBar.style.transition = '';
          badge.classList.remove('up');
          void badge.offsetWidth;
          badge.classList.add('up');
          paint();
        }, 900);
      } else {
        paint();
      }
    }, 2600);
  }

  /* ---------- Витрина интерфейса ---------- */

  var VIEWS = [
    { tab: 'Основной', title: 'Основной вид', text: 'Обложка, часы с календарём и пульт — слева. Подборки, «Волна» и миксы дня — справа.', src: 'assets/shots/main.webp', w: 1920, h: 1080 },
    { tab: 'Студия', title: 'Студия', text: 'Разделы и плейлисты слева, виджеты сверху, плеер на всю ширину внизу.', src: 'assets/shots/studio.webp', w: 1920, h: 1080 },
    { tab: 'Проигрыватель', title: 'Проигрыватель', text: 'Пластинка с тонармом, крутилка громкости и разделы, разложенные по кругу.', src: 'assets/shots/deck.webp', w: 1920, h: 1080 },
    { tab: 'Ранги', title: 'Ранги', text: 'Опыт за музыку, задания, достижения, 9 рангов и общий рейтинг.', src: 'assets/shots/ranked.webp', w: 1440, h: 1000 },
    { tab: 'Аврора', title: 'Тема «Аврора»', text: 'Одна из 7 тем оформления. Ещё есть Стекло, Неон, Терминал, Брутализм, Винил и Бумага.', src: 'assets/shots/aurora.webp', w: 1440, h: 1000 },
    { tab: 'Неон', title: 'Тема «Неон»', text: 'Тема меняет цвета всего окна — от кнопок до часов и календаря.', src: 'assets/shots/neon.webp', w: 1440, h: 1000 }
  ];

  var tabsBox = $('[data-tabs]');
  var win = $('[data-win]');
  var stage = $('[data-stage]');
  if (tabsBox && win && stage) {
    var ind = $('.tab-ind', tabsBox);
    var cap = $('[data-caption]');
    var capNum = $('[data-cap-num]');
    var capTitle = $('[data-cap-title]');
    var capText = $('[data-cap-text]');
    var backL = $('[data-back="l"]');
    var backR = $('[data-back="r"]');
    var active = -1;
    var autoplay = !reduced;

    var imgs = VIEWS.map(function (v, i) {
      var im = doc.createElement('img');
      im.src = v.src;
      im.alt = 'NedoSpot — ' + v.title;
      im.width = v.w;
      im.height = v.h;
      im.decoding = 'async';
      if (i > 0) im.loading = 'lazy';
      win.insertBefore(im, win.firstChild);
      return im;
    });
    var tabs = VIEWS.map(function (v, i) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', 'false');
      b.textContent = v.tab;
      b.addEventListener('click', function () { autoplay = false; show(i); });
      tabsBox.appendChild(b);
      return b;
    });
    tabsBox.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      autoplay = false;
      var n = (active + (e.key === 'ArrowRight' ? 1 : -1) + VIEWS.length) % VIEWS.length;
      show(n);
      tabs[n].focus();
    });

    var sizeWin = function () {
      var v = VIEWS[active];
      win.style.height = Math.round(win.clientWidth * (v.h / v.w)) + 'px';
    };
    var moveInd = function () {
      var t = tabs[active];
      ind.style.width = t.offsetWidth + 'px';
      ind.style.transform = 'translateX(' + t.offsetLeft + 'px)';
      // на узком экране — прокрутить вкладки к активной
      if (tabsBox.scrollWidth > tabsBox.clientWidth) {
        tabsBox.scrollTo({ left: t.offsetLeft - tabsBox.clientWidth / 2 + t.offsetWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
      }
    };
    var show = function (i) {
      if (i === active) return;
      var first = active === -1;
      active = i;
      imgs.forEach(function (im, k) { im.classList.toggle('on', k === i); });
      tabs.forEach(function (t, k) {
        t.setAttribute('aria-selected', k === i ? 'true' : 'false');
        t.tabIndex = k === i ? 0 : -1;
      });
      var prev = VIEWS[(i - 1 + VIEWS.length) % VIEWS.length];
      var next = VIEWS[(i + 1) % VIEWS.length];
      backL.src = prev.src;
      backR.src = next.src;
      sizeWin();
      moveInd();
      var v = VIEWS[i];
      var fill = function () {
        capNum.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(VIEWS.length).padStart(2, '0');
        capTitle.textContent = v.title;
        capText.textContent = v.text;
        cap.classList.remove('swap');
      };
      if (first) fill();
      else { cap.classList.add('swap'); setTimeout(fill, 260); }
    };
    show(0);
    window.addEventListener('resize', function () { sizeWin(); moveInd(); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(moveInd);

    $('[data-prev]').addEventListener('click', function () { autoplay = false; show((active - 1 + VIEWS.length) % VIEWS.length); });
    $('[data-next]').addEventListener('click', function () { autoplay = false; show((active + 1) % VIEWS.length); });

    // сам листает, пока пользователь не начал выбирать
    var hoverStage = false;
    stage.addEventListener('pointerenter', function () { hoverStage = true; });
    stage.addEventListener('pointerleave', function () { hoverStage = false; });
    loopWhileVisible(stage, function () {
      if (!autoplay || hoverStage || lbOpen) return;
      if (stage._started) show((active + 1) % VIEWS.length);
      stage._started = true;
    }, 5200);

    // Наклон окна за курсором + «подъём» при прокрутке
    var tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    var stageVisible = false;
    var stageRaf = 0;
    if (finePointer && !reduced) {
      stage.addEventListener('pointermove', function (e) {
        var r = win.getBoundingClientRect();
        tilt.tx = ((e.clientX - r.left) / r.width - 0.5) * 7;
        tilt.ty = -((e.clientY - r.top) / r.height - 0.5) * 5;
      });
      stage.addEventListener('pointerleave', function () { tilt.tx = 0; tilt.ty = 0; });
    }
    var backs = $$('.win-back', stage);
    var stageLoop = function () {
      tilt.x += (tilt.tx - tilt.x) * 0.08;
      tilt.y += (tilt.ty - tilt.y) * 0.08;
      var r = stage.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.75)));
      var lift = reduced ? 0 : (1 - p) * 18;
      win.style.setProperty('--rx', tilt.y.toFixed(2) + 'deg');
      win.style.setProperty('--ry', tilt.x.toFixed(2) + 'deg');
      win.style.setProperty('--lift', lift.toFixed(2) + 'deg');
      if (!reduced) {
        var off = (r.top + r.height / 2 - vh / 2) * 0.12;
        backs.forEach(function (b) { b.style.setProperty('--py', off.toFixed(1) + 'px'); });
      }
      if (stageVisible) stageRaf = requestAnimationFrame(stageLoop);
    };
    watch(stage, function () {
      stageVisible = true;
      cancelAnimationFrame(stageRaf);
      stageRaf = requestAnimationFrame(stageLoop);
    }, function () {
      stageVisible = false;
      cancelAnimationFrame(stageRaf);
    }, '100px');

    /* ---------- Просмотр крупно ---------- */

    var lb = $('[data-lightbox]');
    var lbImg = $('[data-lb-img]');
    var lbFrame = $('[data-lb-frame]');
    var lbTitle = $('[data-lb-title]');
    var lbClose = $('[data-lb-close]');
    var lbOpen = false;
    var lbIdx = 0;
    var lastFocus = null;
    var lbShow = function (i) {
      lbIdx = (i + VIEWS.length) % VIEWS.length;
      var v = VIEWS[lbIdx];
      lbFrame.classList.remove('zoomed');
      lbImg.src = v.src;
      lbImg.alt = 'NedoSpot — ' + v.title;
      lbImg.width = v.w;
      lbImg.height = v.h;
      lbTitle.textContent = v.title;
    };
    var openLb = function () {
      lastFocus = doc.activeElement;
      lbShow(active);
      lbOpen = true;
      lb.classList.add('open');
      doc.body.style.overflow = 'hidden';
      lbClose.focus({ preventScroll: true });
    };
    var closeLb = function () {
      lbOpen = false;
      lb.classList.remove('open');
      doc.body.style.overflow = '';
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };
    win.addEventListener('click', openLb);
    lbClose.addEventListener('click', closeLb);
    $('[data-lb-prev]').addEventListener('click', function () { lbShow(lbIdx - 1); });
    $('[data-lb-next]').addEventListener('click', function () { lbShow(lbIdx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    lbFrame.addEventListener('click', function (e) {
      var r = lbFrame.getBoundingClientRect();
      lbFrame.style.setProperty('--ox', ((e.clientX - r.left) / r.width) * 100 + '%');
      lbFrame.style.setProperty('--oy', ((e.clientY - r.top) / r.height) * 100 + '%');
      lbFrame.classList.toggle('zoomed');
    });
    lbFrame.addEventListener('pointermove', function (e) {
      if (!lbFrame.classList.contains('zoomed')) return;
      var r = lbFrame.getBoundingClientRect();
      lbFrame.style.setProperty('--ox', ((e.clientX - r.left) / r.width) * 100 + '%');
      lbFrame.style.setProperty('--oy', ((e.clientY - r.top) / r.height) * 100 + '%');
    });
    doc.addEventListener('keydown', function (e) {
      if (!lbOpen) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
      else if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
      else if (e.key === 'Tab') {
        // фокус не уходит из окна просмотра
        var f = $$('button', lb);
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- Бегущая строка: копия для бесшовности ---------- */

  var mq = $('[data-marquee]');
  if (mq) {
    var g = $('.mq-group', mq);
    var copy = g.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    mq.appendChild(copy);
  }

  /* ---------- Счётчики ---------- */

  $$('[data-count]').forEach(function (el) {
    var target = +el.getAttribute('data-count');
    var from = target === 0 ? 30 : 0; // «0 рекламы» — отсчёт вниз до нуля
    var done = false;
    watch(el, function () {
      if (done) return;
      done = true;
      if (reduced) { el.textContent = target; return; }
      var t0 = performance.now();
      var dur = 1600;
      (function tick(now) {
        var k = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - k, 4);
        el.textContent = Math.round(from + (target - from) * e);
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    });
  });

  /* ---------- Прокрутка: шапка, параллакс главного экрана, манифест ---------- */

  var heroInner = $('[data-hero-parallax]');
  var mText = $('[data-words]');
  var mWords = [];
  if (mText) {
    var words = mText.textContent.trim().split(/\s+/);
    mText.textContent = '';
    words.forEach(function (w, i) {
      var s = doc.createElement('span');
      s.className = 'mw';
      s.textContent = w;
      mText.appendChild(s);
      if (i < words.length - 1) mText.appendChild(doc.createTextNode(' '));
    });
    mWords = $$('.mw', mText);
    if (reduced) mWords.forEach(function (w) { w.classList.add('on'); });
  }

  var ticking = false;
  var lastLit = -1;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;
    if (nav) nav.classList.toggle('scrolled', y > 30);

    if (heroInner && !reduced && y < vh * 1.2) {
      heroInner.style.transform = 'translate3d(0,' + (y * 0.3).toFixed(1) + 'px,0)';
      heroInner.style.opacity = Math.max(0, 1 - y / (vh * 0.65)).toFixed(3);
    }

    if (mWords.length && !reduced) {
      var r = mText.getBoundingClientRect();
      var p = (vh * 0.88 - r.top) / (r.height + vh * 0.4);
      var lit = Math.round(Math.min(1, Math.max(0, p)) * mWords.length);
      if (lit !== lastLit) {
        lastLit = lit;
        for (var i = 0; i < mWords.length; i++) mWords[i].classList.toggle('on', i < lit);
      }
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Ссылка на установщик последней версии ---------- */

  // Кнопки ведут на страницу последнего релиза на GitHub. Если GitHub отвечает —
  // ставим прямую ссылку на установщик .exe и показываем номер версии.
  var releaseLinks = $$('[data-release]');
  if (releaseLinks.length && window.fetch) {
    var ctrl = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);
    fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' }, signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        clearTimeout(timer);
        if (!data || !data.assets) return;
        var exe = data.assets.filter(function (a) { return /\.exe$/i.test(a.name) && !/blockmap/i.test(a.name); })[0];
        if (!exe) return;
        releaseLinks.forEach(function (a) {
          a.href = exe.browser_download_url;
          a.removeAttribute('target');
          a.title = exe.name;
        });
        var ver = (data.tag_name || '').replace(/^v/, '');
        var plat = $('.platform span');
        if (ver && plat) {
          plat.innerHTML = 'Версия ' + ver.replace(/[^0-9a-z.\-]/gi, '') + ' · Windows 10 и 11 (64-бит) · Linux — скоро · обновляется сам · <a href="' + RELEASES + '" target="_blank" rel="noopener">все версии</a>';
        }
      })
      .catch(function () { clearTimeout(timer); });
  }

  /* ---------- Вопросы: раскрывающийся список ---------- */

  $$('[data-faq] .faq-q').forEach(function (btn) {
    var panel = doc.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (panel) panel.classList.toggle('open', open);
    });
  });

  /* ---------- Год в подвале ---------- */

  var yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
