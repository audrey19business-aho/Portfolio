/* Shared interactions: nav state, mobile toggle, scroll reveal, year stamp */
(() => {
  // Mark JS-enabled — gives the reveal animation its initial hidden state.
  document.documentElement.classList.add('js');

  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav__toggle');

  // Sticky-nav border + smart-hide on scroll
  // - At the top: visible, no border
  // - Scrolled past threshold: gets a hairline border
  // - Scrolling DOWN past threshold: hides (slides up out of view)
  // - Scrolling UP: reveals
  let lastY = window.scrollY;
  const HIDE_AT = 96;        // pixels — nav stays put inside this band
  const SCROLL_DELTA = 4;    // ignore tiny jitters
  const onScroll = () => {
    if (!nav) return;
    const y  = window.scrollY;
    const dy = y - lastY;

    // Hairline border once you've left the very top
    nav.classList.toggle('is-scrolled', y > 8);

    // Always show near the top
    if (y <= HIDE_AT) {
      nav.classList.remove('is-hidden');
    } else if (Math.abs(dy) > SCROLL_DELTA) {
      // Hide on downward scroll, reveal on upward scroll
      if (dy > 0)      nav.classList.add('is-hidden');
      else             nav.classList.remove('is-hidden');
    }

    lastY = y;
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Reveal nav whenever the user opens the mobile menu
  if (nav) nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  // Mobile menu
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('is-open'));
    nav.querySelectorAll('.nav__list a').forEach(a =>
      a.addEventListener('click', () => nav.classList.remove('is-open'))
    );
  }

  // Active link
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__list a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('is-active');
    }
  });

  // IntersectionObserver-based reveal
  const els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && els.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach(el => io.observe(el));
    // Safety: reveal anything still hidden after 2s (e.g. headless renders / fast scroll)
    setTimeout(() => els.forEach(el => el.classList.add('is-in')), 2000);
  } else {
    els.forEach(el => el.classList.add('is-in'));
  }

  // Footer year
  const y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();

  // ---------------------------------------------------------
  // Back-to-top floating button (injected on every page)
  // ---------------------------------------------------------
  const toTopBtn = document.createElement('button');
  toTopBtn.className = 'to-top';
  toTopBtn.type = 'button';
  toTopBtn.setAttribute('aria-label', 'Back to top');
  toTopBtn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 13V3M3 8l5-5 5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.appendChild(toTopBtn);

  toTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const TO_TOP_THRESHOLD = 320;
  const updateToTop = () => toTopBtn.classList.toggle('is-visible', window.scrollY > TO_TOP_THRESHOLD);
  document.addEventListener('scroll', updateToTop, { passive: true });
  updateToTop();

  // ---------------------------------------------------------
  // Tabbed slideshow viewer (UI/UX & Media pages)
  // Each slide carries its own counter / title / bullets / link
  // — JS only toggles which tab + slide is active.
  // ---------------------------------------------------------
  const viewer = document.querySelector('[data-viewer]');
  if (viewer) {
    const tabs    = [...viewer.querySelectorAll('[role="tab"]')];
    const panels  = [...viewer.querySelectorAll('.tabpanel')];
    const prevBtn = viewer.querySelector('[data-nav="prev"]');
    const nextBtn = viewer.querySelector('[data-nav="next"]');

    const switcherList  = viewer.querySelector('[data-case-list]');
    const casePrevBtns  = [...viewer.querySelectorAll('[data-case-prev]')];
    const caseNextBtns  = [...viewer.querySelectorAll('[data-case-next]')];

    const updateSwitcher = (panel) => {
      // Sync the dark "Case 1 / Case 2 / ..." bar AND any inline arrows
      const slides = [...panel.querySelectorAll('.slide')];
      const idx = parseInt(panel.dataset.idx || '0', 10);
      if (switcherList) {
        [...switcherList.querySelectorAll('button')].forEach((b, i) => {
          b.setAttribute('aria-current', i === idx ? 'true' : 'false');
        });
      }
      casePrevBtns.forEach(b => b.disabled = idx === 0);
      caseNextBtns.forEach(b => b.disabled = idx === slides.length - 1);
    };

    const setSlide = (panel, idx) => {
      const slides = [...panel.querySelectorAll('.slide')];
      idx = (idx + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      panel.dataset.idx = idx;
      if (panel.dataset.tab === 'research') updateSwitcher(panel);
    };

    const activePanel = () => panels.find(p => p.classList.contains('is-active'));

    const setTab = (id, opts = {}) => {
      tabs.forEach(t => {
        const on = t.dataset.tab === id;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach(p => p.classList.toggle('is-active', p.dataset.tab === id));
      // Toggle research-mode on the whole viewer so CSS can hide side
      // arrows and reveal the dark case switcher
      viewer.classList.toggle('is-research', id === 'research');
      const panel = activePanel();
      if (!panel) return;
      const startIdx = opts.fromEnd ? panel.querySelectorAll('.slide').length - 1 : 0;
      setSlide(panel, startIdx);
    };

    tabs.forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));

    // When the user switches case, take them back to the top of the
    // page so the new case opens from the very start.
    // Defer slightly so the browser's automatic focus-scroll on the
    // clicked button finishes first; otherwise it can fight ours.
    const scrollToCaseTop = () => {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 60);
    };
    // Prevent the default focus-induced scroll on case-switcher buttons
    // so the click doesn't briefly jerk the page towards the button.
    const suppressFocusScroll = (el) => el.addEventListener('mousedown', e => e.preventDefault());

    // Wire the dark case switcher (research tab only)
    if (switcherList) {
      [...switcherList.querySelectorAll('button')].forEach((b, i) => {
        suppressFocusScroll(b);
        b.addEventListener('click', () => {
          const panel = panels.find(p => p.dataset.tab === 'research');
          if (panel) {
            setSlide(panel, i);
            scrollToCaseTop();
          }
        });
      });
    }
    const moveCase = (dir) => {
      const panel = panels.find(p => p.dataset.tab === 'research');
      if (!panel) return;
      const cur = parseInt(panel.dataset.idx || '0', 10);
      const total = panel.querySelectorAll('.slide').length;
      const next = cur + dir;
      if (next >= 0 && next < total) {
        setSlide(panel, next);
        scrollToCaseTop();
      }
    };
    casePrevBtns.forEach(b => { suppressFocusScroll(b); b.addEventListener('click', () => moveCase(-1)); });
    caseNextBtns.forEach(b => { suppressFocusScroll(b); b.addEventListener('click', () => moveCase(+1)); });

    // Toggle the floating fixed arrows when the user has scrolled past
    // the inline ones. Hides them near the top (where inline arrows live)
    // and near the bottom (where the dark switcher lives).
    const updateFloatingArrows = () => {
      if (!viewer.classList.contains('is-research')) {
        viewer.classList.remove('is-floating');
        return;
      }
      const panel = panels.find(p => p.dataset.tab === 'research');
      const slide = panel?.querySelector('.slide.is-active');
      const head  = slide?.querySelector('.slide__head');
      const switcher = viewer.querySelector('.case-switcher');
      if (!head || !switcher) { viewer.classList.remove('is-floating'); return; }
      const headRect = head.getBoundingClientRect();
      const swRect   = switcher.getBoundingClientRect();
      // Show: when the inline arrows have scrolled out of view (head bottom above viewport)
      //       AND the bottom switcher is still below the viewport
      const inlineGone = headRect.bottom < 80;
      const switcherStillBelow = swRect.top > window.innerHeight - 40;
      viewer.classList.toggle('is-floating', inlineGone && switcherStillBelow);
    };
    document.addEventListener('scroll', updateFloatingArrows, { passive: true });
    // Run on tab change too (when we toggle is-research)
    tabs.forEach(t => t.addEventListener('click', () => requestAnimationFrame(updateFloatingArrows)));
    updateFloatingArrows();

    const move = (dir) => {
      const panel = activePanel();
      if (!panel) return;
      const slides = panel.querySelectorAll('.slide');
      const cur = parseInt(panel.dataset.idx || '0', 10);
      const next = cur + dir;

      // Wrap across tabs at the ends
      if (next < 0) {
        const i = tabs.findIndex(t => t.dataset.tab === panel.dataset.tab);
        const prev = tabs[(i - 1 + tabs.length) % tabs.length];
        setTab(prev.dataset.tab, { fromEnd: true });
        return;
      }
      if (next >= slides.length) {
        const i = tabs.findIndex(t => t.dataset.tab === panel.dataset.tab);
        const nxt = tabs[(i + 1) % tabs.length];
        setTab(nxt.dataset.tab);
        return;
      }
      setSlide(panel, next);
    };

    if (prevBtn) prevBtn.addEventListener('click', () => move(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => move(+1));

    // Keyboard arrow nav (only when viewer is focused area)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  move(-1);
      if (e.key === 'ArrowRight') move(+1);
    });

    // Initialise
    const initial = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
    if (initial) setTab(initial.dataset.tab);
  }
})();
