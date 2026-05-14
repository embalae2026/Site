/* =========================================================
   EMBALAÊ — interações
   ========================================================= */

(() => {
  'use strict';

  // ----- LOADER -----
  const loader = document.getElementById('loader');
  function hideLoader() {
    if (loader) loader.classList.add('is-hidden');
  }
  // some rapidamente — não esperamos o vídeo
  setTimeout(hideLoader, 600);

  // ?nl pula o loader pra screenshots
  if (location.search.includes('nl')) {
    if (loader) loader.style.display = 'none';
  }

  // ----- BOXGATE: caixa 3D que abre como portal -----
  const boxgate = document.getElementById('boxgate');
  const box = document.getElementById('box');
  const navEl = document.getElementById('nav');
  const fadeEl = document.getElementById('boxgateFade');
  const hintEl = document.getElementById('boxgateHint');
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ?nl ou reduced-motion: pula a animação direto e libera a nav
  if (boxgate && (location.search.includes('nl') || prefersReducedMotion)) {
    boxgate.remove();
    if (navEl) navEl.classList.remove('is-stowed');
  } else if (boxgate && box) {
    const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (t) => t * t * (3 - 2 * t); // smoothstep
    const phase = (p, s, e) => clamp((p - s) / (e - s));

    // Smooth progress: o scroll define um "alvo", e applied persegue ele com inércia.
    // Isso dá a sensação fluida (movimento orgânico em vez de seco)
    let targetProgress = 0;
    let appliedProgress = 0;
    let isAnimating = true;
    let lastTime = performance.now();

    function readTargetFromScroll() {
      const rect = boxgate.getBoundingClientRect();
      const total = boxgate.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      targetProgress = clamp(scrolled / total);
    }

    function applyState(progress) {
      // ---- FASE 1 (0.00 → 0.06): idle com leve respiração ----
      const idleBob = Math.sin(performance.now() * 0.0014) * 1.2;

      // ---- FASE 2 (0.02 → 0.30): rotação reveladora ----
      // gira um pouco antes de começar a abrir, pra estabelecer profundidade
      const rotP = smooth(phase(progress, 0.02, 0.30));
      const ry = lerp(-22, 14, rotP);
      const rx = lerp(-8, -14, rotP);

      // ---- FASE 3 (0.18 → 0.55): abrir as 4 abas COMO PÉTALAS PRA CIMA ----
      // GEOMETRIA: pra cada aba o ângulo é em torno de sua dobradiça local. Após
      // a pré-rotação dos containers (rotateY ±90 em leste/oeste, espelhamento em sul),
      // o resultado é o mesmo: --flap-* = 90deg = fechada (deitada pra dentro);
      // --flap-* = 180deg = aba VERTICAL pra cima; --flap-* = 195deg = passou
      // ligeiramente da vertical pra fora (pétala aberta).
      // ATENÇÃO: ir de 90 pra valores NEGATIVOS abria as abas pra direção errada
      // (passavam por 0 = pendurada pra dentro/baixo da caixa). Tem que ir 90 → 180+.
      const FLAP_FINAL = 195;
      const overshootFlap = (t) => {
        // ease-out com pequeno overshoot pra dar peso sem passar muito
        const e = smooth(t);
        return e + Math.sin(e * Math.PI) * 0.03 * (1 - e * 0.4);
      };
      // stagger leve (6% entre primeira e última) — todas fazem o mesmo gesto visual
      const flapN = lerp(90, FLAP_FINAL, overshootFlap(phase(progress, 0.18, 0.48)));
      const flapS = lerp(90, FLAP_FINAL, overshootFlap(phase(progress, 0.20, 0.50)));
      const flapE = lerp(90, FLAP_FINAL, overshootFlap(phase(progress, 0.22, 0.52)));
      const flapW = lerp(90, FLAP_FINAL, overshootFlap(phase(progress, 0.24, 0.54)));

      // --open: 0 (fechada=90) → 1 (totalmente aberta=FLAP_FINAL).
      const openAmount = clamp((Math.min(flapN, flapS, flapE, flapW) - 90) / (FLAP_FINAL - 90));

      // ---- FASE 4 (0.62 → 0.96): câmera mergulha olhando o interior ----
      // Começa só DEPOIS das abas terminarem de abrir, dando momento de "caixa
      // totalmente aberta" antes do mergulho.
      const zoomP = smooth(phase(progress, 0.62, 0.96));
      const scale = lerp(1, 6.2, zoomP);
      const tz = lerp(0, 520, zoomP);
      // câmera centra (ry → 0) e tomba pra olhar pro chão da caixa
      const ryFinal = lerp(ry, 0, zoomP);
      const rxFinal = lerp(rx, -38, zoomP);

      // respiração só no idle
      const idleFactor = 1 - smooth(phase(progress, 0.0, 0.15));
      const ryWithBob = ryFinal + idleBob * idleFactor;

      const s = box.style;
      s.setProperty('--ry', `${ryWithBob.toFixed(2)}deg`);
      s.setProperty('--rx', `${rxFinal.toFixed(2)}deg`);
      s.setProperty('--scale', scale.toFixed(3));
      s.setProperty('--tz', `${tz.toFixed(1)}px`);
      s.setProperty('--flap-north', `${flapN.toFixed(2)}deg`);
      s.setProperty('--flap-south', `${flapS.toFixed(2)}deg`);
      s.setProperty('--flap-east',  `${flapE.toFixed(2)}deg`);
      s.setProperty('--flap-west',  `${flapW.toFixed(2)}deg`);
      s.setProperty('--open', openAmount.toFixed(3));

      // Fade pro hero real só no finalzinho (0.88 → 1.0)
      const fadeP = smooth(phase(progress, 0.88, 1.0));
      if (fadeEl) fadeEl.style.opacity = fadeP.toFixed(3);
      if (hintEl) hintEl.classList.toggle('is-faded', progress > 0.03);
      if (navEl)  navEl.classList.toggle('is-stowed', progress < 0.85);
    }

    function tick(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000); // segundos, com cap pra evitar saltos após aba inativa
      lastTime = now;

      // Lerp temporal: catch-up ~100ms. Suaviza flicks bruscos de trackpad
      // mas mantém responsividade pra scrolls naturais.
      const factor = 1 - Math.pow(0.001, dt * 10);
      appliedProgress += (targetProgress - appliedProgress) * factor;

      applyState(appliedProgress);

      // Continua loopando se a aplicação ainda persegue o alvo OU se estamos perto do início (pra respiração)
      const diff = Math.abs(targetProgress - appliedProgress);
      isAnimating = diff > 0.0005 || appliedProgress < 0.20;
      if (isAnimating) {
        requestAnimationFrame(tick);
      }
    }

    function kick() {
      readTargetFromScroll();
      if (!isAnimating) {
        isAnimating = true;
        lastTime = performance.now();
        requestAnimationFrame(tick);
      }
    }

    // Inicial
    readTargetFromScroll();
    appliedProgress = targetProgress; // começa sincronizado pra evitar salto no load
    requestAnimationFrame(tick);

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick, { passive: true });
    window.addEventListener('wheel', kick, { passive: true });
    window.addEventListener('touchmove', kick, { passive: true });
  }

  // ----- ANO no footer -----
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ----- CURSOR CUSTOMIZADO -----
  const cursor = document.getElementById('cursor');
  const cursorDot = document.getElementById('cursorDot');
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;

  if (cursor && cursorDot && !isTouch) {
    let mouseX = 0, mouseY = 0;
    let cx = 0, cy = 0;
    let dx = 0, dy = 0;

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function loop() {
      // dot acompanha rápido
      dx += (mouseX - dx) * 0.6;
      dy += (mouseY - dy) * 0.6;
      cursorDot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;

      // ring tem leve atraso
      cx += (mouseX - cx) * 0.18;
      cy += (mouseY - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;

      requestAnimationFrame(loop);
    }
    loop();

    // estados hover/big
    document.querySelectorAll('[data-cursor="hover"]').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });
    document.querySelectorAll('[data-cursor="big"]').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-big'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-big'));
    });

    // some quando sai da janela
    document.addEventListener('mouseleave', () => {
      cursor.style.opacity = 0;
      cursorDot.style.opacity = 0;
    });
    document.addEventListener('mouseenter', () => {
      cursor.style.opacity = 1;
      cursorDot.style.opacity = 1;
    });
  }

  // ----- REVEAL ON SCROLL -----
  // só ativa o efeito se IO existir; senão deixa tudo visível
  if ('IntersectionObserver' in window && !location.search.includes('nl')) {
    const revealEls = document.querySelectorAll('.formato-card, .pilar, .processo-step, .channel, .manifesto-text');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    revealEls.forEach(el => {
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  // ----- PARALLAX SUTIL nos blobs do hero -----
  const blobs = document.querySelectorAll('.hero .blob');
  if (blobs.length && !isTouch) {
    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      blobs.forEach((b, i) => {
        const f = (i + 1) * 12;
        b.style.translate = `${x * f}px ${y * f}px`;
      });
    });
  }

  // ----- VÍDEO HERO: força autoplay -----
  const heroVideo = document.getElementById('heroVideo');
  if (heroVideo) {
    // tenta dar play assim que possível
    const tryPlay = () => heroVideo.play().catch(err => {
      console.warn('[video] autoplay bloqueado:', err);
    });
    if (heroVideo.readyState >= 2) {
      tryPlay();
    } else {
      heroVideo.addEventListener('loadeddata', tryPlay, { once: true });
      heroVideo.addEventListener('canplay', tryPlay, { once: true });
    }
    // play em interação (caso o navegador exija)
    document.addEventListener('click', tryPlay, { once: true });
    document.addEventListener('scroll', tryPlay, { once: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) tryPlay();
    });
  }

  // ----- TILT 3D nos formato-cards -----
  const tiltCards = document.querySelectorAll('.formato-card');
  if (tiltCards.length && !isTouch) {
    tiltCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const rx = (-y * 6).toFixed(2);
        const ry = (x * 6).toFixed(2);
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

})();
