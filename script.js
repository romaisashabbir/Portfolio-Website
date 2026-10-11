/* =========================================================
   Romaisa Shabbir - Portfolio interactions (vanilla JavaScript)
   Sections: helpers, background, theme, navigation, scroll effects,
   reveal, contact form, footer.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (selector, scope) { return (scope || document).querySelector(selector); };
  var $$ = function (selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); };
  var reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Background animation (declared first so the theme toggle can refresh it) ---------- */
  var background = (function () {
    var canvas = $('#bg-canvas');
    if (!canvas || !canvas.getContext) return { refresh: function () {} };

    var ctx = canvas.getContext('2d');
    var width = 0, height = 0, particles = [], frameId = null, rgb = '126,162,255', lineAlpha = 0.5;

    function readColors() {
      var accent = getComputedStyle(root).getPropertyValue('--accent').trim();
      var match = /^#([0-9a-f]{6})$/i.exec(accent);
      if (match) {
        var n = parseInt(match[1], 16);
        rgb = ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
      }
      lineAlpha = root.dataset.theme === 'light' ? 0.3 : 0.5;
    }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var count = Math.max(18, Math.min(60, Math.round((width * height) / 26000)));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.4 + 0.8
        });
      }
    }

    function draw(move) {
      ctx.clearRect(0, 0, width, height);
      var maxDist = 130;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        if (move) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > width) p.vx *= -1;
          if (p.y < 0 || p.y > height) p.vy *= -1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + rgb + ',' + (lineAlpha + 0.2) + ')';
        ctx.fill();

        for (var j = i + 1; j < particles.length; j++) {
          var q = particles[j];
          var dx = p.x - q.x, dy = p.y - q.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = 'rgba(' + rgb + ',' + (lineAlpha * (1 - dist / maxDist) * 0.6) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }

    function loop() {
      draw(true);
      frameId = requestAnimationFrame(loop);
    }

    function stop() {
      if (frameId) { cancelAnimationFrame(frameId); frameId = null; }
    }

    function start() {
      stop();
      if (reducedMotionQuery.matches) { draw(false); return; } // single static frame
      frameId = requestAnimationFrame(loop);
    }

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { resize(); start(); }, 200);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    if (reducedMotionQuery.addEventListener) reducedMotionQuery.addEventListener('change', start);

    readColors();
    resize();
    start();

    return { refresh: function () { readColors(); if (!frameId) draw(false); } };
  })();

  /* ---------- Theme toggle ---------- */
  (function () {
    var button = $('#theme-toggle');
    var themeMeta = $('meta[name="theme-color"]');
    if (!button) return;

    function apply(theme, save) {
      root.dataset.theme = theme;
      button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#070b16' : '#f4f7fd');
      if (save) { try { localStorage.setItem('theme', theme); } catch (e) { /* storage unavailable */ } }
      background.refresh();
    }

    apply(root.dataset.theme === 'light' ? 'light' : 'dark', false);
    button.addEventListener('click', function () {
      apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    });
  })();

  /* ---------- Mobile menu ---------- */
  (function () {
    var toggle = $('#nav-toggle');
    var menu = $('#nav-menu');
    if (!toggle || !menu) return;

    function setOpen(open) {
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }

    toggle.addEventListener('click', function () { setOpen(!menu.classList.contains('is-open')); });
    $$('.nav-link', menu).forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('click', function (e) {
      if (menu.classList.contains('is-open') && !menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) setOpen(false); });
  })();

  /* ---------- Header shadow + active section highlighting ---------- */
  (function () {
    var header = $('#site-header');
    var links = $$('.nav-link');
    var sections = $$('main section[id]');
    // Sections that are not in the menu are grouped under a nearby menu item
    var alias = { exploring: 'education' };
    var ticking = false;

    function update() {
      ticking = false;
      if (header) header.classList.toggle('is-scrolled', window.scrollY > 10);

      var headerHeight = header ? header.offsetHeight : 68;
      var marker = window.scrollY + headerHeight + Math.min(window.innerHeight * 0.35, 240);
      var current = 'home';
      sections.forEach(function (section) { if (section.offsetTop <= marker) current = section.id; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = 'contact';
      current = alias[current] || current;

      links.forEach(function (link) {
        var active = link.getAttribute('href') === '#' + current;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
      });
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  })();

  /* ---------- Scroll reveal ---------- */
  (function () {
    var items = $$('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || reducedMotionQuery.matches) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el) { observer.observe(el); });
  })();

  /* ---------- Contact form ---------- */
  (function () {
    var form = $('#contact-form');
    if (!form) return;

    var status = $('#form-status');
    var submit = $('#cf-submit');
    var note = $('#form-note');
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    // If a form service is configured, the "opens your email app" note no longer applies
    if (note && (form.dataset.endpoint || '').trim()) note.remove();

    var rules = {
      name: function (v) { return v.length >= 2 ? '' : 'Please enter your name (at least 2 characters).'; },
      email: function (v) { return emailPattern.test(v) ? '' : 'Please enter a valid email address.'; },
      subject: function (v) { return v.length >= 3 ? '' : 'Please add a short subject (at least 3 characters).'; },
      message: function (v) { return v.length >= 10 ? '' : 'Please write a message of at least 10 characters.'; }
    };

    function setError(input, message) {
      var field = input.closest('.field');
      var errorBox = $('#err-' + input.name);
      if (field) field.classList.toggle('has-error', Boolean(message));
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (errorBox) errorBox.textContent = message;
    }

    function validateField(input) {
      var message = rules[input.name](input.value.trim());
      setError(input, message);
      return !message;
    }

    function showStatus(message, type) {
      status.textContent = message;
      status.classList.remove('is-success', 'is-error');
      if (type) status.classList.add(type);
    }

    // Clear an error as soon as the visitor fixes the field
    $$('input, textarea', form).forEach(function (input) {
      input.addEventListener('blur', function () { validateField(input); });
      input.addEventListener('input', function () {
        if (input.closest('.field').classList.contains('has-error')) validateField(input);
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      showStatus('', null);

      var inputs = $$('input, textarea', form);
      var firstInvalid = null;
      inputs.forEach(function (input) {
        if (!validateField(input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        showStatus('Please fix the highlighted fields and try again.', 'is-error');
        return;
      }

      var data = {};
      inputs.forEach(function (input) { data[input.name] = input.value.trim(); });
      var endpoint = (form.dataset.endpoint || '').trim();
      var fallbackEmail = form.dataset.mailto || 'romaisashabbir23@gmail.com';

      if (endpoint) {
        // A form service (for example Formspree) has been configured
        submit.disabled = true;
        showStatus('Sending…', null);
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        })
          .then(function (res) {
            if (!res.ok) throw new Error('Request failed');
            form.reset();
            showStatus('Thank you! Your message has been sent.', 'is-success');
          })
          .catch(function () {
            showStatus('Sorry, the message could not be sent. Please email ' + fallbackEmail + ' directly.', 'is-error');
          })
          .then(function () { submit.disabled = false; });
        return;
      }

      // No form service configured: open the visitor's email app with the message ready.
      var body = 'Name: ' + data.name + '\nEmail: ' + data.email + '\n\n' + data.message;
      var mailto = 'mailto:' + fallbackEmail + '?subject=' + encodeURIComponent(data.subject) + '&body=' + encodeURIComponent(body);
      if (mailto.length > 1900) {
        var box = $('#cf-message');
        setError(box, 'This message is too long for the email shortcut. Please shorten it or email me directly.');
        box.focus();
        showStatus('Please shorten your message and try again.', 'is-error');
        return;
      }
      window.location.href = mailto;
      showStatus('Your email app should open with the message ready to send. If nothing opens, email ' + fallbackEmail + ' directly.', null);
    });
  })();

  /* ---------- Footer: dynamic year + back to top ---------- */
  (function () {
    var year = $('#year');
    if (year) year.textContent = new Date().getFullYear();

    var top = $('#back-to-top');
    if (top) {
      top.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reducedMotionQuery.matches ? 'auto' : 'smooth' });
      });
    }
  })();
})();