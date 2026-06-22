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
    const smooth = (t) => t * t * (3 - 2 * t); // smoothstep
    const phase = (p, s, e) => clamp((p - s) / (e - s));

    // ABERTURA POR AUTOPLAY (não é mais scroll-driven):
    // a caixa nasce fechada com o scroll TRAVADO. O PRIMEIRO input (rolar, tocar,
    // clicar ou tecla) dispara UMA animação por TEMPO (~1,2s) que abre a tampa +
    // mergulha pra dentro e entra no site. Vantagens sobre o scroll-driven antigo:
    //   - "um scroll único": um gesto só já abre tudo
    //   - roda SUAVE (depende do tempo, não da cadência do scroll → não trava)
    //   - one-shot: ao terminar a caixa some e NÃO reabre/fecha até dar refresh
    const DURATION = 1200; // ms — único ponto pra deixar mais rápido/lento
    let started = false;
    let gateDone = false;
    let startTime = 0;

    document.documentElement.classList.add('gate-locked'); // trava o scroll na entrada

    function applyState(progress) {
      // Fases (em fração do tempo):
      //   0.00 → 0.06  : idle
      //   0.06 → 0.40  : tampa abre com easing magnético
      //   0.40 → 0.92  : MERGULHO — caixa tomba e CRESCE até o interior engolir a tela
      //   0.92 → 1.00  : revela a hero atrás (hand-off natural)
      const magnetEase = (t) => {
        const e = smooth(t);
        return e + Math.sin(e * Math.PI) * 0.03 * (1 - e * 0.5);
      };
      const lidAmount = clamp(magnetEase(phase(progress, 0.06, 0.40)));
      const diveT     = smooth(phase(progress, 0.40, 0.92));
      const revealT   = smooth(phase(progress, 0.92, 1.00));

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

      if (fadeEl) fadeEl.style.opacity = '0';
      if (stickyEl) stickyEl.style.setProperty('--reveal', revealT.toFixed(3));
      if (hintEl) hintEl.classList.toggle('is-faded', progress > 0.02);
      if (navEl)  navEl.classList.toggle('is-stowed', progress < 0.92);
      if (waFabEl) waFabEl.classList.toggle('is-stowed', progress < 0.92);
    }

    // Fim da abertura: destrava o scroll, remove a boxgate do layout (display:none
    // via is-gate-done) e leva o hero pro topo. One-shot — não há como reverter.
    function finishGate() {
      if (gateDone) return;
      gateDone = true;
      applyState(1);
      document.documentElement.classList.remove('gate-locked');
      document.documentElement.classList.add('is-gate-done');
      if (navEl) navEl.classList.remove('is-stowed');
      if (waFabEl) waFabEl.classList.remove('is-stowed');
      window.scrollTo(0, 0);
      removeStartListeners();
    }

    function frame(now) {
      if (!startTime) startTime = now;
      const t = clamp((now - startTime) / DURATION);
      applyState(t);
      if (t >= 1) { finishGate(); return; }
      requestAnimationFrame(frame);
    }

    function startGate() {
      if (started || gateDone) return;
      started = true;
      startTime = 0;
      requestAnimationFrame(frame);
      removeStartListeners();
    }

    // Dispara no 1º input: roda do mouse, toque/clique (pointerdown) ou tecla de avançar.
    const startEvents = ['wheel', 'pointerdown', 'keydown'];
    function onInput(e) {
      if (e.type === 'keydown') {
        const ok = [' ', 'Spacebar', 'Enter', 'ArrowDown', 'PageDown'];
        if (!ok.includes(e.key)) return;
      }
      startGate();
    }
    function removeStartListeners() {
      startEvents.forEach((ev) => window.removeEventListener(ev, onInput));
    }
    startEvents.forEach((ev) => window.addEventListener(ev, onInput, { passive: true }));

    applyState(0); // estado inicial: caixa fechada
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

  // ----- CONTATO / WHATSAPP -----
  // ⚠️ TROCAR pelo número real da Embalaê, formato E.164 SEM "+" e SEM espaços.
  //    Ex.: (11) 91234-5678  ->  '5511912345678'
  //    É o ÚNICO lugar pra mexer — modal e links diretos usam essa constante.
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

  // Todos os CTAs marcados com [data-open-contact] abrem o modal de contato (que
  // envia a conversa pro WhatsApp): etiqueta flutuante, "orçamento", "tô com uma
  // ideia" e "ver formatos malucos".
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-contact]')) {
      e.preventDefault();
      openModal();
    }
  });

  // Scroll suave nos links âncora (menu + internos). Não usamos scroll-behavior:smooth
  // global porque quebra a fluidez do boxgate — então animamos só no clique. Aplica um
  // offset = altura do nav fixo pra a seção não ficar escondida atrás dele.
  const navForOffset = document.getElementById('nav');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('a[href^="#"]:not([data-open-contact])').forEach((link) => {
    link.addEventListener('click', (e) => {
      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      const offset = (navForOffset ? navForOffset.offsetHeight : 80) + 12;
      const top = hash === '#topo'
        ? 0
        : Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
      window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
      history.pushState(null, '', hash);
    });
  });
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

  // Links DIRETOS pro WhatsApp ([data-wa-link]) — ex.: "conversar agora" na seção
  // contato. Monta o href com o número acima + uma mensagem inicial.
  const waMsg = encodeURIComponent('Oi! Vim pelo site da Embalaê e quero embalar uma ideia.');
  document.querySelectorAll('[data-wa-link]').forEach((a) => {
    a.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });

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

  // ----- ESCONDER O FAB perto do fim da página -----
  // Quando a área de contato ou o rodapé entram na tela, o card flutuante some
  // (pra não sobrepor as infos). Ao subir, ele reaparece. Estado por interseção.
  const fabEnd = document.getElementById('waFab');
  const endZones = [
    document.getElementById('contato'),
    document.querySelector('.footer'),
  ].filter(Boolean);
  if (fabEnd && endZones.length && 'IntersectionObserver' in window) {
    const visibleEnd = new Set();
    const fabIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleEnd.add(entry.target);
        else visibleEnd.delete(entry.target);
      });
      fabEnd.classList.toggle('is-hidden-end', visibleEnd.size > 0);
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    endZones.forEach(el => fabIO.observe(el));
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

  // ----- VÍDEO HERO -----
  // No DESKTOP: carrega sob demanda (preload=none no HTML) e toca o loop de fundo.
  // No MOBILE/touch: NÃO baixa o vídeo (3.4MB) — fica só o poster (14KB), economizando
  // dados e bateria. O fundo do hero continua tendo a arte, só que estática.
  const heroVideo = document.getElementById('heroVideo');
  if (heroVideo && !isTouch) {
    const tryPlay = () => heroVideo.play().catch(err => {
      console.warn('[video] autoplay bloqueado:', err);
    });
    heroVideo.preload = 'auto';
    heroVideo.load();
    if (heroVideo.readyState >= 2) tryPlay();
    heroVideo.addEventListener('loadeddata', tryPlay, { once: true });
    heroVideo.addEventListener('canplay', tryPlay, { once: true });
    document.addEventListener('click', tryPlay, { once: true });
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
