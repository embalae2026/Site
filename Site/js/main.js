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

  // ----- BOXGATE: caixa 3D scroll-driven — estética magnet + mergulho final -----
  // Fluxo: rola → tampa abre (estética magnet) → continua rolando → câmera mergulha
  // pra dentro da caixa → fade verde disfarça a transição pro hero real abaixo.
  const boxgate = document.getElementById('boxgate');
  const box = document.getElementById('box');
  const navEl = document.getElementById('nav');
  const waFabEl = document.getElementById('waFab');
  const fadeEl = document.getElementById('boxgateFade');
  const hintEl = document.getElementById('boxgateHint');
  const stickyEl = boxgate ? boxgate.querySelector('.boxgate-sticky') : null;
  const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (boxgate && (location.search.includes('nl') || prefersReducedMotion)) {
    boxgate.remove();
    // sem gate acima, o hero não deve ter o margin-top:-100vh (que existia só pra
    // sobrepor o trilho) — a classe zera a margem e o hero vira o topo real.
    document.documentElement.classList.add('is-gate-done');
    if (navEl) navEl.classList.remove('is-stowed');
    if (waFabEl) waFabEl.classList.remove('is-stowed');
  } else if (boxgate && box) {
    const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (t) => t * t * (3 - 2 * t); // smoothstep
    const phase = (p, s, e) => clamp((p - s) / (e - s));

    // Smooth progress com lerp temporal — scroll define alvo, applied persegue com inércia
    let targetProgress = 0;
    let appliedProgress = 0;
    let isAnimating = true;
    let lastTime = performance.now();
    let gateDone = false; // vira true quando a caixa termina de abrir (latch)

    function readTargetFromScroll() {
      const total = boxgate.offsetHeight - window.innerHeight;
      if (total <= 0) return;
      const rect = boxgate.getBoundingClientRect();
      const scrolled = -rect.top;
      targetProgress = clamp(scrolled / total);
    }

    // Abertura concluída: remove a boxgate do layout e fixa o hero no topo.
    // Resolve dois bugs de uma vez:
    //   - não "fecha" mais ao rolar pra cima (a animação não reverte)
    //   - os botões do hero voltam a receber clique (a sticky parava de cobrir)
    function finishGate() {
      if (gateDone) return;
      gateDone = true;
      applyState(1); // garante estado 100% revelado antes de tirar do layout
      // Remover o gate encurta a página em exatamente `range` (altura do trilho menos
      // a sticky). Compensar o scroll por esse valor mantém o conteúdo no lugar —
      // no fluxo normal cai no topo (o hero já preenche a tela), e num refresh já
      // fundo no site o usuário não é puxado de volta.
      const range = boxgate.offsetHeight - window.innerHeight;
      const prevY = window.scrollY;
      document.documentElement.classList.add('is-gate-done');
      if (navEl) navEl.classList.remove('is-stowed');
      if (waFabEl) waFabEl.classList.remove('is-stowed');
      window.scrollTo(0, Math.max(0, prevY - range));
      window.removeEventListener('scroll', kick);
      window.removeEventListener('wheel', kick);
      window.removeEventListener('touchmove', kick);
    }

    function applyState(progress) {
      // Fluxo:
      //   0.00 → 0.08  : idle (caixa parada, hint visível)
      //   0.08 → 0.42  : tampa abre com easing magnético
      //   0.42 → 0.92  : MERGULHO — caixa tomba e CRESCE até o interior lima
      //                  ENGOLIR a tela. Sem fade lima ajudando — é o próprio
      //                  interior da caixa que vira fullscreen.
      //   0.92 → 1.00  : sticky bg some → REVELA a hero atrás (a caixa, já
      //                  preenchendo a tela inteira de lima, faz o hand-off natural)
      const magnetEase = (t) => {
        const e = smooth(t);
        return e + Math.sin(e * Math.PI) * 0.03 * (1 - e * 0.5);
      };
      const lidAmount = clamp(magnetEase(phase(progress, 0.08, 0.42)));
      const diveT     = smooth(phase(progress, 0.42, 0.92));
      const revealT   = smooth(phase(progress, 0.92, 1.00));

      // MERGULHO AGRESSIVO — sem isso, a caixa só rotaciona um pouco e cresce
      // de leve, o que parece "objeto se movendo" e não "câmera entrando".
      // - rxEx -62 → total rotateX = -90° (topo da caixa de frente pra câmera)
      // - ryEx 24 → anula yaw base (frontal, sem skew lateral)
      // - tz 1100 + perspective 1800 = scale via perspectiva ~2.6x base, mas a
      //   abertura (adiantada em Z após rotação) chega a ~5x — efeito de túnel
      // - scale 1→3 multiplicado pelo perspective scale = ~15x visual no final.
      //   O suficiente pra que a cavidade lima preencha completamente a tela.
      const rxEx  = diveT * -62;
      const ryEx  = diveT * 24;
      const tz    = diveT * 1100;
      const scale = 1 + diveT * 2;

      const s = box.style;
      s.setProperty('--lid', lidAmount.toFixed(3));
      s.setProperty('--open', lidAmount.toFixed(3));
      s.setProperty('--scale', scale.toFixed(3));
      s.setProperty('--tz', tz.toFixed(1) + 'px');
      s.setProperty('--rx-extra', rxEx.toFixed(2) + 'deg');
      s.setProperty('--ry-extra', ryEx.toFixed(2) + 'deg');

      // Sem fade lima — a própria caixa em zoom dramático preenche a tela.
      if (fadeEl) fadeEl.style.opacity = '0';
      // Sticky bg + caixa: fade out pra revelar hero atrás (z-index 4) no fim
      if (stickyEl) stickyEl.style.setProperty('--reveal', revealT.toFixed(3));
      if (hintEl) hintEl.classList.toggle('is-faded', progress > 0.03);
      if (navEl)  navEl.classList.toggle('is-stowed', progress < 0.95);
      if (waFabEl) waFabEl.classList.toggle('is-stowed', progress < 0.95);
    }

    function tick(now) {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      // Lerp temporal: catch-up ~100ms. Suaviza flicks bruscos de trackpad.
      const factor = 1 - Math.pow(0.001, dt * 10);
      appliedProgress += (targetProgress - appliedProgress) * factor;
      applyState(appliedProgress);
      // terminou de abrir → latch (não reverte mais)
      if (appliedProgress > 0.995) { finishGate(); return; }
      const diff = Math.abs(targetProgress - appliedProgress);
      isAnimating = diff > 0.0005;
      if (isAnimating) requestAnimationFrame(tick);
    }

    function kick() {
      if (gateDone) return;
      readTargetFromScroll();
      if (!isAnimating) {
        isAnimating = true;
        lastTime = performance.now();
        requestAnimationFrame(tick);
      }
    }

    readTargetFromScroll();
    appliedProgress = targetProgress;
    requestAnimationFrame(tick);

    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick, { passive: true });
    window.addEventListener('wheel', kick, { passive: true });
    window.addEventListener('touchmove', kick, { passive: true });
  }

  // ----- HERO SCROLL HINT: "role pra ver" some quando o site já abriu e o user rola -----
  const heroScrollEl = document.querySelector('.hero-scroll');
  if (heroScrollEl) {
    const updateHeroScroll = () => {
      heroScrollEl.classList.toggle('is-hidden', window.scrollY > 40);
    };
    window.addEventListener('scroll', updateHeroScroll, { passive: true });
    updateHeroScroll();
  }

  // ----- ANO no footer -----
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ----- MODAL DE CONTATO (acionado pela etiqueta-FAB) -----
  // Número da Embalaê — TROCAR pelo número real (formato E.164 sem +)
  const WHATSAPP_NUMBER = '';
  const waModal = document.getElementById('waModal');
  const waFab = document.getElementById('waFab');
  const waForm = document.getElementById('waForm');
  let lastFocused = null;

  function openModal() {
    if (!waModal) return;
    lastFocused = document.activeElement;
    waModal.hidden = false;
    document.body.classList.add('is-modal-open');
    const firstInput = waModal.querySelector('input, textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  }
  function closeModal() {
    if (!waModal) return;
    waModal.hidden = true;
    document.body.classList.remove('is-modal-open');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  if (waFab) {
    waFab.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  }
  if (waModal) {
    waModal.addEventListener('click', (e) => {
      if (e.target.closest('[data-close-modal]')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !waModal.hidden) closeModal();
    });
  }
  if (waForm) {
    waForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!waForm.checkValidity()) {
        waForm.reportValidity();
        return;
      }
      const data = new FormData(waForm);
      const nome = (data.get('nome') || '').toString().trim();
      const email = (data.get('email') || '').toString().trim();
      const msg = (data.get('mensagem') || '').toString().trim();
      const text =
        `Oi, sou ${nome}!\n\n${msg}\n\n— email pra retorno: ${email}`;
      const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      closeModal();
      waForm.reset();
    });
  }

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
