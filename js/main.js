/* Andrés Salazar — Portafolio
   Lenis (smooth scroll) + GSAP / ScrollTrigger / SplitText. Se carga con defer.
   Atributos que usa el HTML:
     data-split     título/párrafo que entra línea por línea desde una máscara
     data-hero      se anima al cargar (no espera al scroll)
     data-reveal    contenedor de media que aparece con un fundido (solo opacity/transform)
     data-parallax  capa interna de la media con parallax leve
     data-fade      aparece subiendo un poco
     data-copy      botón que copia su valor al portapapeles
     data-top       enlace "volver arriba"
   Reglas de rendimiento: solo se animan transform y opacity; todo lo que corre por frame
   (Lenis, cursor, logo de vidrio, fondo líquido) cuelga de un único ticker (el de GSAP). */

(() => {
  const d = document;
  const root = d.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const touch = !finePointer;
  const libs = !!(window.gsap && window.ScrollTrigger && window.SplitText && window.Lenis);
  const motion = !reduce && libs && root.classList.contains('motion');

  if (!motion) root.classList.remove('motion');

  /* ---------- Ticker central: un solo requestAnimationFrame para todo el sitio ---------- */
  const ticker = (() => {
    if (window.gsap) {
      gsap.ticker.lagSmoothing(0);
      return { add: (fn) => gsap.ticker.add(fn), remove: (fn) => gsap.ticker.remove(fn) };
    }
    // sin GSAP (CDN caído): un rAF propio que solo corre si hay suscriptores
    const subs = new Set();
    let id = 0;
    const loop = () => {
      const t = performance.now() / 1000;
      subs.forEach((fn) => fn(t));
      id = subs.size ? requestAnimationFrame(loop) : 0;
    };
    return {
      add(fn) { subs.add(fn); if (!id) id = requestAnimationFrame(loop); },
      remove(fn) { subs.delete(fn); },
    };
  })();

  // Fuentes listas (máx. 800 ms): mismo criterio que el script del <head>
  const fontsReady = new Promise((resolve) => {
    (d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve()).then(resolve);
    setTimeout(resolve, 800);
  });

  /* ---------- Logo de vidrio del hero: entra (fade + 0.92→1), flota y se inclina con el mouse ---------- */
  const glass = d.querySelector('.hero__glass');
  const hero = d.querySelector('.hero');
  const BASE = 'translate(-50%, -50%)';
  const heroReady = () => {
    if (!glass || glass.classList.contains('is-in')) return;
    glass.classList.add('is-in');
    if (!reduce) animateGlass();
  };
  function animateGlass() {
    const MAX_TILT = 8; // grados
    const LERP = 0.06;
    const target = { rx: 0, ry: 0 };
    const cur = { rx: 0, ry: 0, s: 0.92 };
    if (finePointer) {
      addEventListener('pointermove', (e) => {
        target.ry = ((e.clientX / innerWidth) * 2 - 1) * MAX_TILT;
        target.rx = -((e.clientY / innerHeight) * 2 - 1) * MAX_TILT;
      }, { passive: true });
    }
    const t0 = performance.now();
    const frame = () => {
      const t = (performance.now() - t0) / 1000;
      cur.rx += (target.rx - cur.rx) * LERP;
      cur.ry += (target.ry - cur.ry) * LERP;
      cur.s += (1 - cur.s) * LERP;
      const y = Math.sin(t * 0.55) * 6; // flotación lenta
      glass.style.transform = `${BASE} translate3d(0, ${y.toFixed(2)}px, 0) perspective(900px) rotateX(${cur.rx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(2)}deg) scale(${cur.s.toFixed(4)})`;
    };
    // solo corre mientras el hero se ve
    let on = false;
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !on) { on = true; ticker.add(frame); }
      else if (!entry.isIntersecting && on) { on = false; ticker.remove(frame); }
    }).observe(glass);
  }
  if (glass) {
    if (!reduce) glass.style.transform = `${BASE} scale(0.92)`;
    // el hero aparece con las fuentes (fade de 0.6s en CSS); el logo entra justo después
    fontsReady.then(() => setTimeout(heroReady, reduce ? 0 : 450));
  }

  /* ---------- Nav notch ---------- */
  const notch = d.querySelector('[data-notch]');
  if (notch) {
    const toggle = notch.querySelector('.notch__toggle');
    const menu = notch.querySelector('.notch__menu');
    const mobileNav = matchMedia('(max-width: 860px)');
    const setOpen = (open) => {
      notch.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.inert = mobileNav.matches && !open; // cerrado en móvil: no se puede tabular adentro
    };
    setOpen(false);
    mobileNav.addEventListener('change', () => setOpen(false));
    toggle.addEventListener('click', () => setOpen(!notch.classList.contains('is-open')));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    d.addEventListener('click', (e) => { if (!notch.contains(e.target)) setOpen(false); });

    // se encoge un poco al bajar (máx. al 92%) y vuelve a crecer al subir
    let lastY = scrollY;
    addEventListener('scroll', () => {
      const y = scrollY;
      if (Math.abs(y - lastY) < 6) return;
      notch.classList.toggle('is-compact', y > lastY && y > 80);
      lastY = y;
    }, { passive: true });
  }

  /* ---------- Modelo 3D de Lost files: si el módulo no llega (CDN caído), se libera su espacio ---------- */
  const model3d = d.querySelector('[data-model]');
  if (model3d) {
    setTimeout(() => { if (!model3d.classList.contains('is-ready')) model3d.classList.add('is-failed'); }, 10000);
  }

  /* ---------- Barra de progreso retro ("Más en camino"): avanza lento hasta el objetivo y se queda ahí ----------
     El HTML ya trae la barra al 87%; con movimiento reducido (o sin JS) se queda estática así. */
  const bar = d.querySelector('[data-progress]');
  if (bar && !reduce) {
    const blocks = bar.querySelector('.soon__blocks');
    const pct = bar.querySelector('.soon__pct');
    const TARGET = Number(bar.dataset.target) || 87;
    const draw = (v) => {
      const n = Math.round(v / 10);
      blocks.textContent = '█'.repeat(n) + '░'.repeat(10 - n);
      pct.textContent = v + '%';
    };
    draw(0);
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      let v = 0;
      const step = () => {
        v = Math.min(TARGET, v + 1);
        draw(v);
        if (v < TARGET) setTimeout(step, 260 + Math.random() * 420); // ~35 s en llegar, a ratos más lento
      };
      setTimeout(step, 600);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); start(); } }, { threshold: 0.4 });
      io.observe(bar);
    } else {
      draw(TARGET);
    }
  }

  /* ---------- Contador "0% completado" (lost-files.html) ---------- */
  const counter = d.querySelector('[data-counter]');
  if (counter) {
    if (reduce) {
      counter.textContent = '100';
    } else {
      let v = 0;
      const step = () => {
        v = Math.min(100, v + 1 + Math.floor(Math.random() * 9));
        counter.textContent = v;
        if (v < 100) setTimeout(step, 80 + Math.random() * 240);
      };
      setTimeout(step, 900);
    }
  }

  /* ---------- Cursor retro (solo con mouse): flecha 8-bit → mano 8-bit sobre links ---------- */
  if (finePointer) {
    const sprite = (rows) => rows.flatMap((row, y) => [...row].map((c, x) => (c === '1' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : ''))).join('');
    // 1 = pixel blanco · se dibujan a 2× (cada pixel = 2px)
    const ARROW = ['1', '11', '111', '1111', '11111', '111111', '1111111', '111 1', '11  11', '1   11', '     11'];
    const HAND = ['   11', '   11', '   1111', '   11111', '1  111111', '11 111111', '111111111', '111111111', ' 11111111', '  111111', '  111111'];
    const cursor = d.createElement('div');
    cursor.className = 'cursor is-away';
    cursor.innerHTML =
      `<svg class="cursor__arrow" viewBox="0 0 7 11" fill="#fff" aria-hidden="true">${sprite(ARROW)}</svg>` +
      `<svg class="cursor__hand" viewBox="0 0 9 11" fill="#fff" aria-hidden="true">${sprite(HAND)}</svg>`;
    d.body.append(cursor);
    root.classList.add('has-cursor');

    // leve retraso con el ticker central (sin retraso con movimiento reducido)
    let move = (x, y) => { cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`; };
    if (window.gsap && !reduce) {
      const qx = gsap.quickTo(cursor, 'x', { duration: 0.12, ease: 'power3.out' });
      const qy = gsap.quickTo(cursor, 'y', { duration: 0.12, ease: 'power3.out' });
      move = (x, y) => { qx(x); qy(y); };
    }
    addEventListener('pointermove', (e) => {
      move(e.clientX, e.clientY);
      cursor.classList.remove('is-away');
    }, { passive: true });
    d.documentElement.addEventListener('pointerleave', () => cursor.classList.add('is-away'));
    d.addEventListener('pointerover', (e) => {
      const onLink = !!e.target.closest('a[href], button, [data-drag], .model__canvas');
      cursor.classList.toggle('is-hand', onLink);
    });
  }

  /* ---------- Refracción del logo de vidrio: solo navegadores Chromium ---------- */
  const brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
  if (brands.some((b) => /Chromium/.test(b.brand))) root.classList.add('refract');

  /* ---------- Fondo: líquido (WebGL) en escritorio; gradiente CSS en móvil, gama baja o movimiento reducido ---------- */
  const ambient = d.querySelector('.ambient');
  if (ambient && !d.body.classList.contains('page-lost')) {
    let fade = 1;
    const updateFade = () => {
      // se desvanece por completo al pasar ~60% del primer pantallazo
      const f = Math.max(0, 1 - scrollY / (innerHeight * 0.6));
      if (f === fade) return;
      fade = f;
      ambient.style.opacity = `calc(var(--ambient-max, 1) * ${f.toFixed(3)})`;
    };
    updateFade();
    const lite = reduce || touch || innerWidth < 900 || (navigator.hardwareConcurrency || 8) <= 4;
    const liquid = lite ? null : initLiquid(ambient, () => fade);
    addEventListener('scroll', () => { updateFade(); if (liquid) liquid.wake(); }, { passive: true });
  }

  function initLiquid(box, getFade) {
    const canvas = box.querySelector('.ambient__liquid');
    const gl = canvas && canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'low-power' });
    if (!gl) return null; // sin WebGL: quedan las manchas CSS

    const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
    const FRAG = `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif
      uniform vec2 uRes;
      uniform float uTime;
      // hash sin seno (estable también con poca precisión)
      float hash(vec2 p){
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float fbm(vec2 p){
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
        return v;
      }
      void main(){
        vec2 uv = gl_FragCoord.xy / uRes;              // origen abajo-izquierda
        float asp = uRes.x / uRes.y;
        vec2 p = vec2(uv.x * asp, uv.y);
        float t = uTime * 0.035;
        // deformación líquida (domain warping)
        vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, t)), fbm(p * 1.4 + vec2(5.2, -t)));
        vec2 r = vec2(fbm(p * 1.8 + 3.0 * q + vec2(1.7, 9.2) + t), fbm(p * 1.8 + 3.0 * q + vec2(8.3, 2.8) - t));
        vec2 w = uv + (r - 0.5) * 0.45;
        // mancha azul (#0A3BFF) desde abajo a la izquierda
        vec2 ca = vec2(0.02 + 0.06 * sin(t * 3.0), 0.02 + 0.05 * cos(t * 2.3));
        float a = smoothstep(0.95, 0.0, length((w - ca) * vec2(asp, 1.0)) * 0.9);
        // mancha azul profundo (#001A8C) desde arriba a la derecha
        vec2 cb = vec2(0.98 + 0.05 * cos(t * 2.6), 1.0 + 0.05 * sin(t * 2.0));
        float b = smoothstep(1.0, 0.0, length((w - cb) * vec2(asp, 1.0)) * 0.85);
        vec3 col = vec3(0.0196);                                   // #050505
        col = mix(col, vec3(0.0, 0.102, 0.549), pow(b, 1.4) * 0.9);  // #001A8C
        col = mix(col, vec3(0.039, 0.231, 1.0), pow(a, 1.6) * 0.62); // #0A3BFF
        col += vec3(0.0, 0.05, 0.25) * smoothstep(0.4, 0.85, r.x) * (a + b) * 0.5; // vetas
        col += (hash(gl_FragCoord.xy + uTime) - 0.5) / 255.0;      // dithering contra bandas
        gl_FragColor = vec4(col, 1.0);
      }`;
    const shader = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = shader(gl.VERTEX_SHADER, VERT);
    const fs = shader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');

    // media resolución y devicePixelRatio fijo en 1: el gradiente es difuso, no se nota y cuesta 4× menos
    const SCALE = 0.5;
    const size = () => {
      canvas.width = Math.max(2, Math.round(innerWidth * SCALE));
      canvas.height = Math.max(2, Math.round(innerHeight * SCALE));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    const t0 = performance.now() - 40000; // arranca a mitad de ciclo
    const draw = () => {
      gl.uniform1f(uTime, (performance.now() - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    size();
    draw();
    box.classList.add('is-liquid');
    let rid = 0;
    addEventListener('resize', () => { clearTimeout(rid); rid = setTimeout(() => { size(); draw(); }, 200); });

    // ~30 fps en el ticker central; se suelta cuando no se ve (scroll abajo) o la pestaña está oculta
    let running = false;
    let last = 0;
    const frame = () => {
      if (getFade() <= 0 || d.hidden) { running = false; ticker.remove(frame); return; }
      const now = performance.now();
      if (now - last < 33) return;
      last = now;
      draw();
    };
    const wake = () => {
      if (running || getFade() <= 0 || d.hidden) return;
      running = true;
      ticker.add(frame);
    };
    d.addEventListener('visibilitychange', () => (d.hidden ? (running = false, ticker.remove(frame)) : wake()));
    wake();
    return { wake };
  }

  /* ---------- Carrusel arrastrable con el mouse ---------- */
  d.querySelectorAll('[data-drag]').forEach((el) => {
    let down = false;
    let startX = 0;
    let startLeft = 0;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return; // en touch el scroll horizontal ya es nativo
      down = true;
      startX = e.clientX;
      startLeft = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
    });
    el.addEventListener('pointermove', (e) => { if (down) el.scrollLeft = startLeft - (e.clientX - startX); });
    const up = () => { down = false; el.classList.remove('is-dragging'); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });

  /* ---------- Copiar email ---------- */
  d.querySelectorAll('[data-copy]').forEach((btn) => {
    const label = btn.textContent;
    const done = btn.dataset.copied || 'Copiado ✓';
    btn.addEventListener('click', async () => {
      btn.style.minWidth = btn.offsetWidth + 'px'; // que no cambie de ancho al cambiar el texto
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = done;
      } catch {
        btn.textContent = 'Cópialo a mano';
      }
      btn.classList.add('is-done');
      setTimeout(() => {
        btn.textContent = label;
        btn.classList.remove('is-done');
        btn.style.minWidth = '';
      }, 1800);
    });
  });

  /* ---------- Videos perezosos ----------
     En el HTML van sin src (data-src + poster + preload="none").
     1) Un poco antes de entrar en pantalla se les pone el src.
     2) Se reproducen solo los que se ven, máximo 4 a la vez (los más visibles); el resto en pausa.
     Con movimiento reducido no se reproducen solos: muestran controles (salvo los de scroll de las webs). */
  const MAX_PLAYING = 4;
  const lazyVideos = [...d.querySelectorAll('video[data-src]')];
  const loadVideo = (v) => {
    if (v.src) return;
    v.src = v.dataset.src;
    v.preload = 'auto';
    if (v.dataset.rate) v.defaultPlaybackRate = v.playbackRate = Number(v.dataset.rate) || 1;
  };
  const visible = new Map(); // video → proporción visible
  const updatePlaying = () => {
    const ranked = [...visible.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
    const allowed = new Set(reduce ? [] : ranked.slice(0, MAX_PLAYING));
    lazyVideos.forEach((v) => {
      if (allowed.has(v)) {
        loadVideo(v);
        if (v.paused) v.play().catch(() => {});
      } else if (!v.paused && !v.closest('.preview')) {
        v.pause();
      }
    });
  };
  if (!('IntersectionObserver' in window)) {
    lazyVideos.forEach(loadVideo);
  } else {
    const loader = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        loadVideo(target);
        loader.unobserve(target);
      });
    }, { rootMargin: '300px 0px' });
    const player = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
        if (isIntersecting && intersectionRatio > 0.15) visible.set(target, intersectionRatio);
        else visible.delete(target);
      });
      updatePlaying();
    }, { threshold: [0, 0.15, 0.35, 0.6, 0.85, 1] });
    lazyVideos.forEach((v) => {
      if (v.closest('.preview')) return; // los del preview de work.html cargan al pasar el mouse
      if (reduce && !v.hasAttribute('data-no-controls')) v.controls = true;
      loader.observe(v);
      player.observe(v);
    });
  }

  /* ---------- Videos de scroll de las webs: empiezan desde 0 ----------
     Cada vez que su capítulo (o su tarjeta) entra en pantalla, o se llega por su ancla. */
  const restartScrollVideo = (scope) => {
    const v = scope && scope.querySelector('video[data-rate]');
    if (!v) return;
    loadVideo(v);
    v.currentTime = 0;
    updatePlaying();
  };
  const scopes = [...d.querySelectorAll('.c-chapter[id], .web-card')].filter((el) => el.querySelector('video[data-rate]'));
  if ('IntersectionObserver' in window && scopes.length) {
    const seen = new WeakMap();
    const restarter = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting && !seen.get(target)) restartScrollVideo(target);
        seen.set(target, isIntersecting);
      });
    }, { threshold: 0.1 });
    scopes.forEach((el) => restarter.observe(el));
  }
  if (location.hash) restartScrollVideo(d.querySelector(location.hash));
  addEventListener('hashchange', () => restartScrollVideo(d.querySelector(location.hash)));

  /* ---------- Contador de los carruseles ("01 / 07") ---------- */
  d.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('.c-track');
    const current = carousel.querySelector('[data-carousel-current]');
    const cards = [...track.children];
    if (!current || !cards.length) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      // con scrollLeft y offsetLeft: sin getBoundingClientRect en cada evento
      const x = track.scrollLeft + 1;
      let idx = 0;
      cards.forEach((c, i) => { if (c.offsetLeft - track.offsetLeft - x < c.offsetWidth / 2) idx = i; });
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) idx = cards.length - 1;
      current.textContent = String(idx + 1).padStart(2, '0');
    };
    track.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    update();
  });

  /* ---------- Sin animaciones (movimiento reducido o sin librerías): scroll nativo ---------- */
  if (!motion) {
    d.querySelectorAll('[data-top]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      scrollTo(0, 0);
    }));
    return;
  }

  /* ================== A partir de aquí: solo con animaciones ================== */
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const EASE = 'power4.out';

  /* ---------- Smooth scroll: Lenis con mouse/trackpad; en pantallas táctiles, scroll nativo ---------- */
  const lenis = touch ? null : new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false });
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    ticker.add((t) => lenis.raf(t * 1000));
  }
  const scrollToEl = (target, opts = {}) => {
    if (lenis) return lenis.scrollTo(target, opts);
    const y = target === 0 ? 0 : target.getBoundingClientRect().top + scrollY + (opts.offset || 0);
    scrollTo({ top: y, behavior: opts.immediate ? 'auto' : 'smooth' });
  };

  // Lenis no lee scroll-margin-top: se usa como offset (24px por defecto)
  const anchorOffset = (el) => -(parseFloat(getComputedStyle(el).scrollMarginTop) || 24);
  if (location.hash) {
    const target = d.querySelector(location.hash);
    if (target) {
      const go = () => scrollToEl(target, { immediate: true, force: true, offset: anchorOffset(target) });
      requestAnimationFrame(go);
      fontsReady.then(() => setTimeout(go, 120)); // otra vez cuando las alturas son definitivas
    }
  }

  /* Entrada de página: sin fundido global (ocultaba el primer pantallazo y retrasaba el LCP).
     El hero entra con su propio fade al cargar las fuentes; el resto, con data-split / data-fade. */

  /* ---------- will-change solo mientras dura la animación ---------- */
  const wc = (targets, prop = 'transform') => ({
    onStart() { gsap.set(targets, { willChange: prop }); },
    onComplete() { gsap.set(targets, { willChange: 'auto' }); },
  });

  /* ---------- Títulos línea por línea ----------
     Se dividen SOLO cuando las fuentes están listas (antes no hay saltos: el texto no cambia de forma).
     Si cambia el ancho antes de que un título se anime, se vuelve a dividir (debounce de 200 ms). */
  const splits = [];
  const buildSplit = (item) => {
    const { el, isHero } = item;
    item.split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    gsap.set(el, { visibility: 'visible' });
    item.tween = gsap.from(item.split.lines, {
      yPercent: 115,
      duration: isHero ? 1.5 : 1.25,
      ease: EASE,
      stagger: isHero ? 0.12 : 0.08,
      delay: isHero ? 0.15 : 0,
      scrollTrigger: isHero ? undefined : { trigger: el, start: 'top 90%', once: true },
      ...wc(item.split.lines),
      onComplete() {
        gsap.set(item.split.lines, { willChange: 'auto' });
        item.done = true;
        item.split.revert(); // el texto vuelve a fluir solo
      },
    });
  };
  fontsReady.then(() => {
    d.querySelectorAll('[data-split]').forEach((el) => {
      const item = { el, isHero: el.hasAttribute('data-hero'), done: false };
      splits.push(item);
      buildSplit(item);
    });
    ScrollTrigger.refresh();

    let lastW = innerWidth;
    let t = 0;
    addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (innerWidth === lastW) return; // solo si cambió el ancho (no la barra del navegador móvil)
        lastW = innerWidth;
        splits.forEach((item) => {
          if (item.done) return;
          if (item.tween.scrollTrigger) item.tween.scrollTrigger.kill();
          item.tween.kill();
          item.split.revert();
          buildSplit(item);
        });
        ScrollTrigger.refresh();
      }, 200);
    });
  });

  /* ---------- Fade ---------- */
  d.querySelectorAll('[data-fade]').forEach((el) => {
    const inHero = !!el.closest('.hero, .page-hero, .case-hero, .c-hero');
    gsap.to(el, {
      opacity: 1, y: 0, duration: 1.1, ease: EASE,
      delay: inHero ? 0.5 : 0,
      // lo que está en el primer pantallazo entra al cargar, aunque quede muy abajo
      scrollTrigger: inHero ? undefined : { trigger: el, start: 'top 92%', once: true },
      ...wc(el, 'transform, opacity'),
    });
  });

  /* ---------- Media: aparece con un fundido + escala (solo opacity / transform) ----------
     Con IntersectionObserver y no con ScrollTrigger: ScrollTrigger mide las posiciones una sola vez, y si el
     layout cambia después (fuentes tardías, el modelo 3D de Lost files, imágenes) el disparador queda más abajo
     que el elemento y la pieza se queda invisible aunque ya esté en pantalla. */
  const reveal = (el, delay = 0) => {
    const inner = el.querySelector('.px');
    const tl = gsap.timeline({ delay });
    tl.to(el, { opacity: 1, duration: 1, ease: 'power2.out' });
    if (inner) tl.from(inner, { scale: 1.18, duration: 1.6, ease: EASE, ...wc(inner) }, 0);
  };
  // Las tarjetas de un carrusel horizontal pueden estar fuera de la vista (a la derecha): se revelan todas
  // juntas cuando el carrusel entra en pantalla, no una por una al arrastrar.
  const revealTargets = [...d.querySelectorAll('[data-reveal]')].filter((el) => !el.closest('.c-track'));
  const trackTargets = [...d.querySelectorAll('.c-track')];
  if ('IntersectionObserver' in window) {
    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        revealIO.unobserve(target);
        if (target.classList.contains('c-track')) {
          target.querySelectorAll('[data-reveal]').forEach((el, i) => reveal(el, Math.min(i, 5) * 0.08));
        } else {
          reveal(target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    revealTargets.forEach((el) => revealIO.observe(el));
    trackTargets.forEach((el) => revealIO.observe(el));
  } else {
    d.querySelectorAll('[data-reveal]').forEach((el) => gsap.set(el, { opacity: 1 }));
  }
  // Si el alto de la página cambia (fuentes, imágenes, modelo 3D), los demás ScrollTriggers se recalculan
  if ('ResizeObserver' in window) {
    let rt = 0;
    let lastH = d.body.offsetHeight;
    new ResizeObserver(() => {
      if (d.body.offsetHeight === lastH) return;
      lastH = d.body.offsetHeight;
      clearTimeout(rt);
      rt = setTimeout(() => ScrollTrigger.refresh(), 150);
    }).observe(d.body);
  }

  /* ---------- Parallax leve (scrub: corre con el ticker central) ---------- */
  d.querySelectorAll('[data-parallax]').forEach((el) => {
    gsap.fromTo(el, { yPercent: -5 }, {
      yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  /* ---------- Nombre + logo del hero: se alejan un poco al hacer scroll ---------- */
  if (hero) {
    gsap.to('.hero__stage', {
      yPercent: -18, opacity: 0.25, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  /* ---------- iPhone en CSS: la captura sube dentro del teléfono; el banner de Weris se ilumina ---------- */
  d.querySelectorAll('[data-phone]').forEach((phone) => {
    const content = phone.querySelector('[data-phone-content]');
    const screen = phone.querySelector('.phone__screen');
    gsap.to(content, {
      y: () => -Math.max(0, content.offsetHeight - screen.clientHeight),
      ease: 'none',
      scrollTrigger: { trigger: phone, start: 'top 85%', end: 'bottom 35%', scrub: 1, invalidateOnRefresh: true },
    });
    const hl = phone.querySelector('.phone__highlight');
    if (hl) {
      gsap.fromTo(hl, { opacity: 0 }, {
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: phone, start: 'top 70%', end: 'center 55%', scrub: true },
      });
    }
  });

  /* ---------- Preview que sigue al cursor (work.html) ---------- */
  const preview = d.querySelector('.preview');
  if (preview && finePointer) {
    preview.hidden = false;
    const items = [...preview.children];
    const xTo = gsap.quickTo(preview, 'x', { duration: 0.6, ease: 'power3.out' });
    const yTo = gsap.quickTo(preview, 'y', { duration: 0.6, ease: 'power3.out' });
    gsap.set(preview, { xPercent: -50, yPercent: -50, scale: 0.85 });
    addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });

    d.querySelectorAll('[data-preview]').forEach((row) => {
      row.addEventListener('pointerenter', () => {
        items.forEach((it) => {
          const on = it.dataset.key === row.dataset.preview;
          it.classList.toggle('is-active', on);
          if (it.tagName !== 'VIDEO') return;
          if (on && !it.src && it.dataset.src) it.src = it.dataset.src;
          on ? it.play().catch(() => {}) : it.pause();
        });
        gsap.to(preview, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'power3.out' });
      });
    });
    d.querySelector('.list').addEventListener('pointerleave', () => {
      gsap.to(preview, { autoAlpha: 0, scale: 0.85, duration: 0.4, ease: 'power3.out' });
      items.forEach((it) => it.tagName === 'VIDEO' && it.pause());
    });
  }

  /* ---------- Transición entre páginas ---------- */
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented) return;

    if (a.hasAttribute('data-top')) {
      e.preventDefault();
      scrollToEl(0);
      return;
    }
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;

    const url = new URL(a.href, location.href);
    if (url.protocol !== location.protocol || url.host !== location.host) return; // mailto:, externos
    if (a.getAttribute('href') === '#') return;

    const samePage = url.pathname === location.pathname && url.search === location.search;
    if (samePage) {
      if (url.hash) {
        const target = d.querySelector(url.hash);
        if (target) {
          e.preventDefault();
          scrollToEl(target, { offset: anchorOffset(target) });
          history.replaceState(null, '', url.hash);
          restartScrollVideo(target);
        }
      }
      return;
    }

    e.preventDefault();
    if (lenis) lenis.stop();
    gsap.to('.page, .footer', {
      opacity: 0, duration: 0.45, ease: 'power2.in',
      onComplete: () => { location.href = url.href; },
    });
  });

  // Volver con el botón "atrás" (bfcache): mostrar el contenido otra vez
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    gsap.set('.page, .footer', { opacity: 1 });
    if (lenis) lenis.start();
  });

  window.__asReady = true;
})();
