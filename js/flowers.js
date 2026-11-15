/*
 * NedoSpot — интерактивное поле цветов (Canvas 2D).
 *
 * Каждый цветок — отдельный объект: своя глубина, размер, скорость, вращение и «дыхание».
 * Курсор (или палец) отталкивает цветы, они возвращаются на место пружиной с инерцией.
 * Быстрое движение курсора запускает волну, за курсором тянется след из лепестков.
 *
 * Производительность:
 *  - каждый вид цветка рисуется один раз в маленький холст (спрайт), дальше только копируется;
 *  - количество цветов зависит от размера экрана и мощности устройства и подстраивается под FPS;
 *  - анимация останавливается, когда поле не видно или вкладка скрыта;
 *  - destroy() снимает все обработчики и останавливает цикл.
 */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var SPRITE = 128; // размер спрайта в пикселях устройства
  var FLOWER_FILL = 0.78; // какая часть спрайта занята самим цветком (остальное — свечение)

  // Белый, молочный, серебристый и немного пастели. Без зелёного.
  var PALETTE = [
    { c: [255, 255, 255], w: 30 },
    { c: [247, 241, 230], w: 22 },
    { c: [221, 225, 233], w: 16 },
    { c: [192, 199, 212], w: 9 },
    { c: [248, 208, 222], w: 8 }, // пудрово-розовый
    { c: [216, 206, 249], w: 6 }, // лаванда
    { c: [251, 221, 202], w: 5 }, // персик
    { c: [203, 224, 249], w: 4 } // голубой
  ];
  var SHAPES = ['sakura', 'round', 'daisy', 'jasmine', 'four'];
  var SHAPE_W = [30, 22, 18, 18, 12];

  function weighted(list, weights) {
    var sum = 0, i;
    for (i = 0; i < weights.length; i++) sum += weights[i];
    var r = Math.random() * sum;
    for (i = 0; i < list.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return list.length - 1;
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function shade(c, k) { return [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)]; }

  // ---------- Спрайты ----------

  var spriteCache = new Map();
  var canFilter = (function () {
    try {
      var t = document.createElement('canvas').getContext('2d');
      return typeof t.filter === 'string';
    } catch (e) { return false; }
  })();

  function petalPath(ctx, shape, L) {
    ctx.beginPath();
    switch (shape) {
      case 'sakura': {
        var w = 0.56 * L;
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-w, -0.22 * L, -w * 0.95, -0.86 * L, -0.15 * L, -L);
        ctx.quadraticCurveTo(-0.04 * L, -0.92 * L, 0, -0.86 * L);
        ctx.quadraticCurveTo(0.04 * L, -0.92 * L, 0.15 * L, -L);
        ctx.bezierCurveTo(w * 0.95, -0.86 * L, w, -0.22 * L, 0, 0);
        break;
      }
      case 'round':
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-0.62 * L, -0.3 * L, -0.5 * L, -L, 0, -L);
        ctx.bezierCurveTo(0.5 * L, -L, 0.62 * L, -0.3 * L, 0, 0);
        break;
      case 'daisy':
        ctx.moveTo(0, -0.16 * L);
        ctx.quadraticCurveTo(-0.15 * L, -0.58 * L, 0, -L);
        ctx.quadraticCurveTo(0.15 * L, -0.58 * L, 0, -0.16 * L);
        break;
      case 'jasmine':
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-0.4 * L, -0.42 * L, 0, -L);
        ctx.quadraticCurveTo(0.4 * L, -0.42 * L, 0, 0);
        break;
      case 'four':
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-0.75 * L, -0.25 * L, -0.62 * L, -L, -0.16 * L, -0.96 * L);
        ctx.quadraticCurveTo(0, -0.84 * L, 0.16 * L, -0.96 * L);
        ctx.bezierCurveTo(0.62 * L, -L, 0.75 * L, -0.25 * L, 0, 0);
        break;
      case 'petal': // одиночный лепесток для следа
        ctx.moveTo(0, 0.5 * L);
        ctx.bezierCurveTo(-0.5 * L, 0.15 * L, -0.35 * L, -0.5 * L, 0, -0.5 * L);
        ctx.bezierCurveTo(0.35 * L, -0.5 * L, 0.5 * L, 0.15 * L, 0, 0.5 * L);
        break;
    }
    ctx.closePath();
  }

  var PETALS = { sakura: 5, round: 5, daisy: 14, jasmine: 6, four: 4 };

  function makeSprite(shape, colorIdx, blurred) {
    var key = shape + '|' + colorIdx + '|' + (blurred ? 1 : 0);
    var hit = spriteCache.get(key);
    if (hit) return hit;

    var cv = document.createElement('canvas');
    cv.width = cv.height = SPRITE;
    var ctx = cv.getContext('2d');
    var c = PALETTE[colorIdx].c;
    var mid = SPRITE / 2;
    var R = (SPRITE * FLOWER_FILL) / 2;

    ctx.translate(mid, mid);

    // мягкое свечение вокруг
    var halo = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, mid);
    halo.addColorStop(0, rgba(c, blurred ? 0.16 : 0.2));
    halo.addColorStop(0.55, rgba(c, 0.05));
    halo.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(-mid, -mid, SPRITE, SPRITE);

    if (blurred && canFilter) ctx.filter = 'blur(' + Math.round(SPRITE / 34) + 'px)';

    if (shape === 'petal') {
      var gp = ctx.createLinearGradient(0, -R, 0, R);
      gp.addColorStop(0, rgba(c, 1));
      gp.addColorStop(1, rgba(shade(c, 0.86), 0.92));
      ctx.fillStyle = gp;
      petalPath(ctx, 'petal', R * 1.6);
      ctx.fill();
    } else {
      var n = PETALS[shape];
      var L = shape === 'daisy' ? R : R * 0.98;
      var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, L);
      grad.addColorStop(0, rgba(shade(c, 0.84), 0.92));
      grad.addColorStop(0.35, rgba(shade(c, 0.96), 0.97));
      grad.addColorStop(1, rgba(c, 1));
      ctx.fillStyle = grad;
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 0.8;
      var off = Math.random() * TAU;
      for (var i = 0; i < n; i++) {
        ctx.save();
        ctx.rotate(off + (i / n) * TAU);
        petalPath(ctx, shape, L);
        ctx.fill();
        if (!blurred) ctx.stroke();
        ctx.restore();
      }
      // вторая, внутренняя «корона» лепестков у сакуры и круглых — объём
      if (shape === 'sakura' || shape === 'round') {
        ctx.save();
        ctx.globalAlpha = 0.55;
        for (var j = 0; j < n; j++) {
          ctx.save();
          ctx.rotate(off + ((j + 0.5) / n) * TAU);
          petalPath(ctx, shape, L * 0.55);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
      // серединка: тёплые сливки + тычинки
      var cr = shape === 'daisy' ? R * 0.24 : R * 0.16;
      var cg = ctx.createRadialGradient(-cr * 0.3, -cr * 0.3, 0, 0, 0, cr);
      cg.addColorStop(0, 'rgba(255,246,214,1)');
      cg.addColorStop(1, 'rgba(226,204,160,0.95)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, cr, 0, TAU);
      ctx.fill();
      if (!blurred) {
        ctx.fillStyle = 'rgba(214,186,140,0.9)';
        var dots = shape === 'daisy' ? 10 : 7;
        for (var k = 0; k < dots; k++) {
          var a = (k / dots) * TAU + off;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * cr * 1.35, Math.sin(a) * cr * 1.35, R * 0.028, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.filter = 'none';
    spriteCache.set(key, cv);
    return cv;
  }

  function makeGlowSprite() {
    var key = 'glow';
    var hit = spriteCache.get(key);
    if (hit) return hit;
    var cv = document.createElement('canvas');
    cv.width = cv.height = SPRITE;
    var ctx = cv.getContext('2d');
    var g = ctx.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
    g.addColorStop(0, 'rgba(255,250,240,0.9)');
    g.addColorStop(0.35, 'rgba(255,250,240,0.25)');
    g.addColorStop(1, 'rgba(255,250,240,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SPRITE, SPRITE);
    spriteCache.set(key, cv);
    return cv;
  }

  // ---------- Устройство ----------

  function deviceTier() {
    var cores = navigator.hardwareConcurrency || 4;
    var mem = navigator.deviceMemory || 8;
    var coarse = global.matchMedia && global.matchMedia('(pointer: coarse)').matches;
    var small = Math.min(global.innerWidth, global.innerHeight) < 600;
    if (cores <= 2 || mem <= 2) return { k: 0.4, dpr: 1.25, mobile: coarse || small };
    if (coarse || small || cores <= 4 || mem <= 4) return { k: 0.62, dpr: 1.5, mobile: coarse || small };
    return { k: 1, dpr: 2, mobile: false };
  }

  // ---------- Поле ----------

  function FlowerField(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.density = opts.density || 1; // множитель количества
    this.horizon = opts.horizon != null ? opts.horizon : 0.46; // где «горизонт» луга (доля высоты)
    this.floaters = opts.floaters != null ? opts.floaters : 0.16; // доля парящих в верхней части
    this.clearZone = opts.clearZone || null; // {x, y, rx, ry} — зона, где меньше крупных цветов (под заголовком)
    this.scrollParallax = opts.scrollParallax != null ? opts.scrollParallax : 0.35;
    this.tier = deviceTier();

    this.particles = [];
    this.trail = [];
    this.ripples = [];
    this.glows = [];
    this.W = 0; this.H = 0; this.dpr = 1;
    this.t = 0;
    this.last = 0;
    this.raf = 0;
    this.running = false;
    this.visible = true;
    this.pageVisible = !document.hidden;

    // указатель
    this.ptr = { x: -9999, y: -9999, vx: 0, vy: 0, active: false, lastMove: 0, lx: 0, ly: 0, dist: 0, nx: 0.5, ny: 0.5, sx: 0.5, sy: 0.5 };
    this.lastRipple = 0;
    this.nextBreeze = 2.5;

    // адаптация под FPS
    this.ratio = 1; // какая доля цветов рисуется
    this.fpsAcc = 0; this.fpsFrames = 0;

    this.reduced = false;
    this.mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (this.mq) this.reduced = this.mq.matches;

    this._bind();
    this._resize(true);
    this._build();
  }

  FlowerField.prototype._bind = function () {
    var self = this;
    this._onPointerMove = function (e) {
      if (e.pointerType === 'touch') return; // касания — отдельно, через touch-события
      self._setPointer(e.clientX, e.clientY);
    };
    this._onPointerDown = function (e) {
      if (e.pointerType === 'touch') return;
      self._setPointer(e.clientX, e.clientY);
      self._burst(self.ptr.x, self.ptr.y, 1);
    };
    this._onLeave = function () { self.ptr.active = false; };
    this._onTouch = function (e) {
      var t = e.touches[0];
      if (!t) return;
      var first = e.type === 'touchstart';
      self._setPointer(t.clientX, t.clientY, first);
      if (first) self._burst(self.ptr.x, self.ptr.y, 0.8);
    };
    this._onTouchEnd = function () { self.ptr.active = false; };
    this._onVis = function () {
      self.pageVisible = !document.hidden;
      self._sync();
    };
    this._onMotion = function (e) { self.reduced = e.matches; };

    global.addEventListener('pointermove', this._onPointerMove, { passive: true });
    global.addEventListener('pointerdown', this._onPointerDown, { passive: true });
    document.documentElement.addEventListener('mouseleave', this._onLeave);
    global.addEventListener('blur', this._onLeave);
    global.addEventListener('touchstart', this._onTouch, { passive: true });
    global.addEventListener('touchmove', this._onTouch, { passive: true });
    global.addEventListener('touchend', this._onTouchEnd, { passive: true });
    global.addEventListener('touchcancel', this._onTouchEnd, { passive: true });
    document.addEventListener('visibilitychange', this._onVis);
    if (this.mq) {
      if (this.mq.addEventListener) this.mq.addEventListener('change', this._onMotion);
      else if (this.mq.addListener) this.mq.addListener(this._onMotion);
    }

    if ('ResizeObserver' in global) {
      var pending = 0;
      this.ro = new ResizeObserver(function () {
        cancelAnimationFrame(pending);
        pending = requestAnimationFrame(function () { self._resize(false); });
      });
      this.ro.observe(this.canvas);
    } else {
      this._onResize = function () { self._resize(false); };
      global.addEventListener('resize', this._onResize);
    }

    if ('IntersectionObserver' in global) {
      this.io = new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
        self._sync();
      }, { rootMargin: '80px' });
      this.io.observe(this.canvas);
    }
  };

  FlowerField.prototype._setPointer = function (cx, cy, reset) {
    var r = this.rect || this.canvas.getBoundingClientRect();
    var x = cx - r.left, y = cy - r.top;
    var p = this.ptr;
    var now = performance.now();
    if (!p.active || reset) {
      p.lx = x; p.ly = y; p.vx = 0; p.vy = 0;
    }
    p.x = x; p.y = y;
    p.active = x >= -60 && y >= -60 && x <= this.W + 60 && y <= this.H + 60;
    p.lastMove = now;
    p.nx = clamp(x / Math.max(1, this.W), 0, 1);
    p.ny = clamp(y / Math.max(1, this.H), 0, 1);
  };

  FlowerField.prototype._resize = function (initial) {
    var rect = this.canvas.getBoundingClientRect();
    var W = Math.max(1, Math.round(rect.width));
    var H = Math.max(1, Math.round(rect.height));
    this.rect = rect;
    var dpr = Math.min(global.devicePixelRatio || 1, this.tier.dpr);
    if (!initial && W === this.W && H === this.H && dpr === this.dpr) return;
    var oldW = this.W, oldH = this.H;
    this.W = W; this.H = H; this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    if (initial || !oldW) return;
    // Сильно поменялась площадь — пересобрать, иначе просто растянуть позиции
    var areaChange = (W * H) / (oldW * oldH);
    if (areaChange > 1.6 || areaChange < 0.6) {
      this._build();
      return;
    }
    var sx = W / oldW, sy = H / oldH;
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      p.hx *= sx; p.hy *= sy; p.x *= sx; p.y *= sy;
    }
    for (var g = 0; g < this.glows.length; g++) {
      this.glows[g].x *= sx; this.glows[g].y *= sy;
    }
  };

  FlowerField.prototype._count = function () {
    var area = this.W * this.H;
    var n = (area / (this.tier.mobile ? 1000 : 1750)) * this.tier.k * this.density;
    var min = this.tier.mobile ? 170 : 220;
    return Math.round(clamp(n, min * this.density, 1250 * this.density));
  };

  FlowerField.prototype._build = function () {
    var W = this.W, H = this.H;
    var n = this._count();
    var list = [];
    var hz = this.horizon * H;
    var cz = this.clearZone;
    var tries = 0;
    while (list.length < n && tries < n * 4) {
      tries++;
      var floater = Math.random() < this.floaters;
      // глубина: больше дальних и средних, мало крупных ближних
      var z = Math.pow(Math.random(), 1.35);
      var x, y;
      if (floater) {
        z *= 0.7;
        x = Math.random() * W;
        y = rand(0.02, this.horizon + 0.1) * H;
      } else {
        // луг: дальние у горизонта, ближние — внизу экрана
        x = rand(-0.03, 1.03) * W;
        var band = clamp(z * 0.85 + rand(-0.18, 0.32), 0, 1.05);
        y = hz + (H * 1.04 - hz) * band;
      }
      // под заголовком — меньше крупных цветов, чтобы текст читался
      if (cz && z > 0.3) {
        var ex = (x - cz.x * W) / (cz.rx * W), ey = (y - cz.y * H) / (cz.ry * H);
        if (ex * ex + ey * ey < 1 && Math.random() < 0.75) continue;
      }
      var shapeIdx = weighted(SHAPES, SHAPE_W);
      var colorIdx = weighted(PALETTE, PALETTE.map(function (p) { return p.w; }));
      var far = z < 0.22;
      var size = far ? rand(5, 10) : z < 0.6 ? rand(9, 19) + z * 8 : rand(18, 30) + (z - 0.6) * 38;
      if (this.tier.mobile) size *= 0.82;
      list.push({
        hx: x, hy: y, x: x, y: y, vx: 0, vy: 0,
        z: z,
        size: size,
        alpha: far ? rand(0.22, 0.42) : z < 0.6 ? rand(0.5, 0.78) : rand(0.8, 1),
        sprite: makeSprite(SHAPES[shapeIdx], colorIdx, far),
        rot: Math.random() * TAU,
        rs: rand(-0.35, 0.35) * (1.2 - z * 0.5), // собственное вращение
        vr: 0,
        ax: rand(3, 9) * (0.5 + z), ay: rand(2, 7) * (0.5 + z) * (floater ? 2.2 : 1), // амплитуда дрейфа
        w1: rand(0.18, 0.5), w2: rand(0.2, 0.55), w3: rand(0.6, 1.1), wb: rand(0.6, 1.4),
        p1: Math.random() * TAU, p2: Math.random() * TAU, p3: Math.random() * TAU, pb: Math.random() * TAU,
        k: 7 + z * 7, // жёсткость пружины: ближние возвращаются бодрее
        keep: Math.random(), // для снижения нагрузки: рисуем только keep < ratio
        energy: 0
      });
    }
    list.sort(function (a, b) { return a.z - b.z; });
    this.particles = list;

    // крупные мягкие огни на заднем плане
    this.glows = [];
    var gN = this.tier.mobile ? 5 : 9;
    for (var g = 0; g < gN; g++) {
      this.glows.push({
        x: rand(0.05, 0.95) * W,
        y: rand(this.horizon - 0.15, 1) * H,
        r: rand(140, 380) * (this.tier.mobile ? 0.7 : 1),
        a: rand(0.025, 0.06),
        w: rand(0.05, 0.12), p: Math.random() * TAU
      });
    }
  };

  // Кольцевая волна (клик, касание, резкое движение)
  FlowerField.prototype._burst = function (x, y, power) {
    if (this.reduced) return;
    if (this.ripples.length > 7) this.ripples.shift();
    this.ripples.push({ type: 'ring', x: x, y: y, r: 0, speed: 560 + power * 260, width: 70 + power * 40, str: 1500 * power, max: 420 + power * 260 });
  };

  // Порыв ветра — фронт волны идёт через весь экран (сам по себе, когда курсора нет)
  FlowerField.prototype._breeze = function () {
    var fromLeft = Math.random() < 0.6;
    this.ripples.push({
      type: 'line', x: fromLeft ? -120 : this.W + 120, dir: fromLeft ? 1 : -1,
      speed: rand(260, 360), width: rand(140, 220), str: rand(260, 420), tilt: rand(-0.35, 0.35)
    });
  };

  FlowerField.prototype._sync = function () {
    var should = this.visible && this.pageVisible;
    if (should && !this.running) {
      this.running = true;
      this.last = performance.now();
      var self = this;
      this.raf = requestAnimationFrame(function loop(now) {
        if (!self.running) return;
        self._frame(now);
        self.raf = requestAnimationFrame(loop);
      });
    } else if (!should && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  };

  FlowerField.prototype.start = function () { this._sync(); return this; };

  FlowerField.prototype._frame = function (now) {
    var rawDt = (now - this.last) / 1000;
    this.last = now;
    var dt = Math.min(rawDt, 1 / 30); // после паузы не «прыгаем»
    this.t += dt;
    this.rect = this.canvas.getBoundingClientRect();

    this._adapt(rawDt);
    this._step(dt, now);
    this._draw();
  };

  // Держим плавность: если кадры медленные — рисуем меньше цветов, если быстрые — возвращаем
  FlowerField.prototype._adapt = function (rawDt) {
    if (rawDt > 0.25) return; // была пауза
    this.fpsAcc += rawDt; this.fpsFrames++;
    if (this.fpsAcc < 1.2) return;
    var fps = this.fpsFrames / this.fpsAcc;
    this.fpsAcc = 0; this.fpsFrames = 0;
    if (fps < 46 && this.ratio > 0.35) this.ratio = Math.max(0.35, this.ratio * 0.82);
    else if (fps > 57 && this.ratio < 1) this.ratio = Math.min(1, this.ratio * 1.06);
  };

  FlowerField.prototype._step = function (dt, now) {
    var W = this.W, H = this.H;
    var reduced = this.reduced;
    var ms = reduced ? 0.25 : 1; // скорость собственного движения
    var t = this.t;
    var P = this.ptr;

    // скорость указателя (сглаженная)
    if (P.active) {
      var ivx = (P.x - P.lx) / Math.max(dt, 1 / 240);
      var ivy = (P.y - P.ly) / Math.max(dt, 1 / 240);
      P.vx += (ivx - P.vx) * 0.35;
      P.vy += (ivy - P.vy) * 0.35;
      var step = Math.hypot(P.x - P.lx, P.y - P.ly);
      P.dist += step;
      P.lx = P.x; P.ly = P.y;
      if (now - P.lastMove > 120) { P.vx *= 0.8; P.vy *= 0.8; }
    } else {
      P.vx *= 0.9; P.vy *= 0.9;
    }
    var pspeed = Math.hypot(P.vx, P.vy);

    // волна от резкого движения + след из лепестков
    if (P.active && !reduced) {
      if (pspeed > 700 && this.t - this.lastRipple > 0.14) {
        this.lastRipple = this.t;
        var pw = clamp(pspeed / 2600, 0.25, 0.8);
        if (this.ripples.length > 7) this.ripples.shift();
        this.ripples.push({ type: 'ring', x: P.x, y: P.y, r: 10, speed: 420 + pw * 300, width: 60, str: 900 * pw, max: 300 + pw * 260 });
      }
      var spawnEvery = this.tier.mobile ? 22 : 13;
      var spawned = 0;
      while (P.dist > spawnEvery && spawned < 3) {
        P.dist -= spawnEvery;
        spawned++;
        this._spawnPetal(P.x, P.y, P.vx, P.vy);
      }
      if (P.dist > spawnEvery) P.dist = 0;
    }

    // ветер, когда указатель не двигается (на телефоне — основное движение)
    var idle = !P.active || now - P.lastMove > 3500;
    if (!reduced && idle && this.t > this.nextBreeze) {
      this._breeze();
      this.nextBreeze = this.t + rand(this.tier.mobile ? 3.5 : 5, this.tier.mobile ? 6 : 9);
    } else if (!idle) {
      this.nextBreeze = Math.max(this.nextBreeze, this.t + 2);
    }

    // плавный параллакс от положения курсора
    P.sx += (P.nx - P.sx) * Math.min(1, dt * 2.2);
    P.sy += (P.ny - P.sy) * Math.min(1, dt * 2.2);
    var parX = (P.sx - 0.5) * -26;
    var parY = (P.sy - 0.5) * -14;
    var scrollOff = this.rect.top < 0 ? this.rect.top * -1 : 0;

    // волны
    var rip = this.ripples;
    for (var r = rip.length - 1; r >= 0; r--) {
      var q = rip[r];
      if (q.type === 'ring') {
        q.r += q.speed * dt;
        q.str *= Math.pow(0.35, dt);
        if (q.r > q.max) rip.splice(r, 1);
      } else {
        q.x += q.dir * q.speed * dt;
        if (q.x < -400 || q.x > W + 400) rip.splice(r, 1);
      }
    }

    var R = this.tier.mobile ? 120 : 175; // радиус влияния курсора
    var S = reduced ? 2600 : 5200; // сила отталкивания
    var WAKE = reduced ? 0 : 2.4; // сила «увлечения» за движением
    var ps = this.particles;
    var ratio = this.ratio;
    var ripN = rip.length;

    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (p.keep > ratio) continue;
      var sp = ms;
      var dz = 0.2 + p.z * 0.8;
      // целевая точка: дом + собственный дрейф + параллакс
      var tx = p.hx + (Math.sin(t * p.w1 * sp + p.p1) * p.ax + Math.sin(t * p.w3 * sp + p.p3) * p.ax * 0.35) + parX * dz;
      var ty = p.hy + Math.cos(t * p.w2 * sp + p.p2) * p.ay + parY * dz - scrollOff * p.z * this.scrollParallax;

      // пружина к цели с затуханием (небольшой «отскок»)
      var ax = (tx - p.x) * p.k - p.vx * (2.3 + p.z * 1.6);
      var ay = (ty - p.y) * p.k - p.vy * (2.3 + p.z * 1.6);

      if (P.active) {
        var dx = p.x - P.x, dy = p.y - P.y;
        var Rz = R * (0.65 + p.z * 0.7);
        var d2 = dx * dx + dy * dy;
        if (d2 < Rz * Rz) {
          var d = Math.sqrt(d2) + 0.01;
          var f = 1 - d / Rz;
          f *= f;
          var depth = 0.35 + p.z * 0.95;
          ax += (dx / d) * f * S * depth + P.vx * f * WAKE * depth;
          ay += (dy / d) * f * S * depth + P.vy * f * WAKE * depth;
          // вращение от «удара»: курсор, проходя мимо, закручивает цветок
          p.vr += ((dx * P.vy - dy * P.vx) / (d * Rz)) * f * 0.012 * depth;
        }
      }

      for (var j = 0; j < ripN; j++) {
        var w = rip[j];
        if (w.type === 'ring') {
          var rx = p.x - w.x, ry = p.y - w.y;
          var rd = Math.sqrt(rx * rx + ry * ry) + 0.01;
          var band = 1 - Math.abs(rd - w.r) / w.width;
          if (band > 0) {
            var fr = band * band * w.str * (0.4 + p.z);
            ax += (rx / rd) * fr; ay += (ry / rd) * fr;
            p.vr += band * 0.02 * (rx > 0 ? 1 : -1);
          }
        } else {
          var lx = p.x - (w.x + (p.y - H * 0.5) * w.tilt);
          var lb = 1 - Math.abs(lx) / w.width;
          if (lb > 0) {
            var fl = lb * lb * w.str * (0.35 + p.z);
            ax += w.dir * fl;
            ay -= fl * 0.45;
            p.vr += lb * 0.004 * w.dir;
          }
        }
      }

      p.vx += ax * dt; p.vy += ay * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vr *= Math.pow(0.12, dt);
      p.rot += (p.rs * sp + p.vr * 60) * dt;
      var e = Math.min(1, Math.sqrt(p.vx * p.vx + p.vy * p.vy) / 420);
      p.energy += (e - p.energy) * Math.min(1, dt * 6);
    }

    // лепестки следа
    var tr = this.trail;
    for (var k = tr.length - 1; k >= 0; k--) {
      var a = tr[k];
      a.life -= dt;
      if (a.life <= 0) { tr.splice(k, 1); continue; }
      a.vx *= Math.pow(0.25, dt);
      a.vy = a.vy * Math.pow(0.4, dt) + 46 * dt; // медленно опускаются
      a.x += a.vx * dt + Math.sin(this.t * a.wf + a.ph) * 12 * dt;
      a.y += a.vy * dt;
      a.rot += a.rs * dt;
    }
  };

  FlowerField.prototype._spawnPetal = function (x, y, vx, vy) {
    if (this.trail.length > (this.tier.mobile ? 50 : 140)) this.trail.shift();
    var c = weighted(PALETTE, PALETTE.map(function (p) { return p.w; }));
    this.trail.push({
      x: x + rand(-6, 6), y: y + rand(-6, 6),
      vx: vx * rand(0.04, 0.12) + rand(-40, 40),
      vy: vy * rand(0.04, 0.12) + rand(-50, 10),
      rot: Math.random() * TAU, rs: rand(-3, 3),
      size: rand(5, 10), life: rand(1.1, 2.1), max: 2.1,
      wf: rand(2, 4), ph: Math.random() * TAU,
      sprite: makeSprite('petal', c, false)
    });
  };

  FlowerField.prototype._draw = function () {
    var ctx = this.ctx;
    var dpr = this.dpr;
    var W = this.W, H = this.H;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    var t = this.t;
    var half = SPRITE / 2;

    // мягкие огни
    var glow = makeGlowSprite();
    for (var g = 0; g < this.glows.length; g++) {
      var G = this.glows[g];
      var gs = (G.r * 2 * dpr) / SPRITE;
      ctx.globalAlpha = G.a * (0.75 + 0.25 * Math.sin(t * G.w * 6 + G.p));
      ctx.setTransform(gs, 0, 0, gs, (G.x + Math.sin(t * G.w + G.p) * 30) * dpr, (G.y + Math.cos(t * G.w + G.p) * 18) * dpr);
      ctx.drawImage(glow, -half, -half);
    }

    // цветы (уже отсортированы от дальних к ближним)
    var ps = this.particles;
    var ratio = this.ratio;
    var base = dpr / (SPRITE * FLOWER_FILL);
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (p.keep > ratio) continue;
      if (p.x < -60 || p.x > W + 60 || p.y < -60 || p.y > H + 60) continue;
      var breath = 1 + 0.07 * Math.sin(t * p.wb + p.pb) + p.energy * 0.22;
      var s = p.size * breath * base;
      var cs = Math.cos(p.rot) * s, sn = Math.sin(p.rot) * s;
      ctx.globalAlpha = Math.min(1, p.alpha * (1 + p.energy * 0.35));
      ctx.setTransform(cs, sn, -sn, cs, p.x * dpr, p.y * dpr);
      ctx.drawImage(p.sprite, -half, -half);
    }

    // лепестки следа
    var tr = this.trail;
    for (var k = 0; k < tr.length; k++) {
      var a = tr[k];
      var life = a.life / a.max;
      var ss = (a.size * dpr) / (SPRITE * FLOWER_FILL);
      var c2 = Math.cos(a.rot) * ss, s2 = Math.sin(a.rot) * ss;
      ctx.globalAlpha = Math.min(1, life * 1.4) * 0.85;
      ctx.setTransform(c2, s2, -s2, c2, a.x * dpr, a.y * dpr);
      ctx.drawImage(a.sprite, -half, -half);
    }

    // мягкий свет вокруг курсора
    var P = this.ptr;
    if (P.active) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      var lr = (this.tier.mobile ? 160 : 260) * dpr;
      var gs2 = (lr * 2) / SPRITE;
      ctx.globalAlpha = 0.07;
      ctx.setTransform(gs2, 0, 0, gs2, P.x * dpr, P.y * dpr);
      ctx.drawImage(glow, -half, -half);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  FlowerField.prototype.destroy = function () {
    this.running = false;
    cancelAnimationFrame(this.raf);
    global.removeEventListener('pointermove', this._onPointerMove);
    global.removeEventListener('pointerdown', this._onPointerDown);
    document.documentElement.removeEventListener('mouseleave', this._onLeave);
    global.removeEventListener('blur', this._onLeave);
    global.removeEventListener('touchstart', this._onTouch);
    global.removeEventListener('touchmove', this._onTouch);
    global.removeEventListener('touchend', this._onTouchEnd);
    global.removeEventListener('touchcancel', this._onTouchEnd);
    document.removeEventListener('visibilitychange', this._onVis);
    if (this.mq) {
      if (this.mq.removeEventListener) this.mq.removeEventListener('change', this._onMotion);
      else if (this.mq.removeListener) this.mq.removeListener(this._onMotion);
    }
    if (this.ro) this.ro.disconnect();
    if (this.io) this.io.disconnect();
    if (this._onResize) global.removeEventListener('resize', this._onResize);
    this.particles = []; this.trail = []; this.ripples = []; this.glows = [];
  };

  global.FlowerField = FlowerField;
})(window);
