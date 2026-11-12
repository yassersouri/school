/* ── Interactive Activities Toolkit ────────────────────────────────
   Shared by every page under gradeN/interactive/. Vanilla JS, no deps.
   Exposes window.IA. See assets/interactive/README.md for the API.
   ─────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var IA = {};
  var STORE = 'ia:';

  /* ── Random helpers ─────────────────────────────────────────── */
  IA.rand = function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };
  IA.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  IA.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  IA.sample = function (arr, n) { return IA.shuffle(arr).slice(0, n); };
  /** Distinct numeric distractors near `answer`, returned shuffled with answer included. */
  IA.numberChoices = function (answer, count, spread, min) {
    count = count || 4; spread = spread || 3; min = (min === undefined) ? 0 : min;
    var set = {}; set[answer] = true; var out = [answer]; var guard = 0;
    while (out.length < count && guard++ < 200) {
      var d = answer + IA.rand(-spread, spread);
      if (d >= min && !set[d]) { set[d] = true; out.push(d); }
    }
    return IA.shuffle(out);
  };

  /* ── DOM helper ─────────────────────────────────────────────── */
  /** el('div', {class:'x', onclick:fn, text:'hi', html:'<b>'}, [children]) */
  IA.el = function (tag, attrs, children) {
    var e = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return e;
  };
  IA.clear = function (node) { while (node.firstChild) node.removeChild(node.firstChild); return node; };

  /* ── Storage ────────────────────────────────────────────────── */
  function load(key, dflt) { try { var v = localStorage.getItem(STORE + key); return v === null ? dflt : JSON.parse(v); } catch (e) { return dflt; } }
  function save(key, v) { try { localStorage.setItem(STORE + key, JSON.stringify(v)); } catch (e) { /* private mode */ } }
  IA.load = load; IA.save = save;
  IA.getStars = function (id) { return (load('stars:' + id, 0)) || 0; };
  IA.setStars = function (id, stars) { if (stars > IA.getStars(id)) save('stars:' + id, stars); };

  /* ── Speech (Web Speech API) ────────────────────────────────── */
  var synth = window.speechSynthesis || null;
  var voice = null;
  IA.speechAvailable = !!(synth && window.SpeechSynthesisUtterance);
  function chooseVoice() {
    if (!synth) return;
    var vs = synth.getVoices() || [];
    var prefs = ['en-CA', 'en-US', 'en-GB', 'en-AU', 'en'];
    var good = /samantha|google|natural|aria|jenny|karen|daniel|serena|moira/i;
    for (var p = 0; p < prefs.length && !voice; p++) {
      var cands = vs.filter(function (v) { return v.lang && v.lang.replace('_', '-').indexOf(prefs[p]) === 0; });
      voice = cands.filter(function (v) { return good.test(v.name); })[0] || cands[0] || null;
    }
  }
  if (synth) { chooseVoice(); if ('onvoiceschanged' in synth) synth.onvoiceschanged = chooseVoice; }
  IA.isMuted = function () { return !!load('muted', false); };
  IA.setMuted = function (m) { save('muted', !!m); if (m) IA.stopSpeech(); updateMuteBtn(); };
  /** Speak text. opts: {rate, pitch, onend, onboundary, force, queue}. Returns the utterance (or null). */
  IA.say = function (text, opts) {
    opts = opts || {};
    if (!IA.speechAvailable || (IA.isMuted() && !opts.force)) { if (opts.onend) setTimeout(opts.onend, 0); return null; }
    if (!voice) chooseVoice();
    if (!opts.queue) synth.cancel();
    var u = new SpeechSynthesisUtterance(String(text));
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-US';
    u.rate = opts.rate || 0.9; u.pitch = opts.pitch || 1.05;
    if (opts.onend) { u.onend = opts.onend; u.onerror = opts.onend; }
    if (opts.onboundary) u.onboundary = opts.onboundary;
    synth.speak(u);
    return u;
  };
  /** Speak a list of strings one after another with a gap (ms) between them. */
  IA.sayParts = function (parts, gap, opts) {
    opts = opts || {}; gap = gap === undefined ? 350 : gap;
    var i = 0;
    IA.stopSpeech();
    (function next() {
      if (i >= parts.length) { if (opts.onend) opts.onend(); return; }
      var text = parts[i++];
      if (opts.onpart) opts.onpart(i - 1);
      IA.say(text, { rate: opts.rate || 0.8, queue: true, force: opts.force, onend: function () { setTimeout(next, gap); } });
    })();
  };
  IA.stopSpeech = function () { if (synth) synth.cancel(); };
  /** A round 🔊 button that speaks `text` (string or function returning string). */
  IA.speakButton = function (text, label) {
    return IA.el('button', { class: 'ia-speak', type: 'button', 'aria-label': 'Hear it', title: 'Hear it',
      onclick: function (e) { e.stopPropagation(); IA.say(typeof text === 'function' ? text() : text, { force: true }); } }, [label || '🔊']);
  };

  /* ── Sound effects (WebAudio, no files) ─────────────────────── */
  var actx = null;
  function tone(freq, dur, when, type, vol) {
    if (IA.isMuted()) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var t = actx.currentTime + (when || 0);
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.05);
    } catch (e) { /* audio unavailable */ }
  }
  IA.sfx = {
    good: function () { tone(660, 0.12); tone(880, 0.18, 0.1); },
    bad: function () { tone(220, 0.22, 0, 'triangle', 0.12); },
    tap: function () { tone(520, 0.06, 0, 'sine', 0.06); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.2, i * 0.12); }); }
  };

  /* ── Visual feedback ────────────────────────────────────────── */
  function flash(el, cls) {
    if (!el || !el.classList) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, 700);
  }
  IA.good = function (el, msg) { IA.sfx.good(); flash(el, 'ia-pop'); if (el && el.classList) el.classList.add('ia-correct'); IA.toast(msg || IA.pick(['Great job! 🎉', 'Yes! ⭐', 'You got it! 🙌', 'Awesome! 🌟', 'Super! 💪'])); };
  IA.bad = function (el, msg) { IA.sfx.bad(); flash(el, 'ia-shake'); IA.toast(msg || IA.pick(['Try again! 🙂', 'Almost! 🤔', 'Not quite — try again!']), true); };
  var toastTimer = null;
  IA.toast = function (msg, isBad) {
    var t = document.getElementById('ia-toast');
    if (!t) { t = IA.el('div', { id: 'ia-toast', class: 'ia-toast', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(t); }
    t.textContent = msg; t.className = 'ia-toast show' + (isBad ? ' bad' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.className = 'ia-toast'; }, 1400);
  };
  IA.confetti = function (n) {
    n = n || 80;
    var colors = ['#e05c00', '#f0c040', '#5e35b1', '#2e7d32', '#1a6fbd', '#c2185b', '#00897b'];
    var layer = IA.el('div', { class: 'ia-confetti', 'aria-hidden': 'true' });
    for (var i = 0; i < n; i++) {
      layer.appendChild(IA.el('i', { style: {
        left: Math.random() * 100 + 'vw', background: IA.pick(colors),
        animationDelay: (Math.random() * 0.6) + 's', animationDuration: (1.6 + Math.random() * 1.4) + 's' } }));
    }
    document.body.appendChild(layer);
    setTimeout(function () { layer.remove(); }, 3500);
  };

  /* ── Page shell ─────────────────────────────────────────────── */
  var muteBtn = null;
  function updateMuteBtn() { if (muteBtn) { muteBtn.textContent = IA.isMuted() ? '🔇' : '🔈'; muteBtn.title = IA.isMuted() ? 'Sound off' : 'Sound on'; } }
  /**
   * Build the page chrome. opts: {id, title, emoji, back, instructions, speakInstructions}
   * Returns {stage, header, setProgress(frac), setScore(text)}
   */
  IA.setup = function (opts) {
    document.body.classList.add('ia-body');
    document.title = opts.title + ' — Interactive';
    var app = document.querySelector('.ia-app');
    if (!app) { app = IA.el('div', { class: 'ia-app' }); document.body.appendChild(app); }
    muteBtn = IA.el('button', { class: 'ia-icon-btn', type: 'button', 'aria-label': 'Toggle sound', onclick: function () { IA.setMuted(!IA.isMuted()); } });
    updateMuteBtn();
    var score = IA.el('div', { class: 'ia-score', 'aria-live': 'polite' });
    var bar = IA.el('div', { class: 'ia-progress-fill' });
    var header = IA.el('header', { class: 'ia-top' }, [
      IA.el('a', { class: 'ia-icon-btn', href: opts.back || '../index.html', 'aria-label': 'Back', title: 'Back' }, ['‹']),
      IA.el('h1', { class: 'ia-title' }, [(opts.emoji ? opts.emoji + ' ' : '') + opts.title]),
      score, muteBtn
    ]);
    app.appendChild(header);
    app.appendChild(IA.el('div', { class: 'ia-progress' }, [bar]));
    if (opts.instructions) {
      var ins = IA.el('p', { class: 'ia-instructions' }, [opts.instructions + ' ']);
      if (opts.speakInstructions !== false) ins.appendChild(IA.speakButton(opts.instructions));
      app.appendChild(ins);
    }
    var stage = IA.el('main', { class: 'ia-stage', id: 'stage' });
    app.appendChild(stage);
    app.appendChild(IA.el('div', { class: 'ia-print-note' }, ['🖥️ This is an on-screen interactive activity — it isn’t meant to be printed. Open it on a computer or tablet to play!']));
    return {
      stage: stage, header: header,
      setProgress: function (f) { bar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, f)) + ')'; },
      setScore: function (t) { score.textContent = t; }
    };
  };

  /** Level picker: levels = [{label, value, desc?}]. Calls onPick(value, level). */
  IA.levelPicker = function (container, title, levels, onPick) {
    IA.clear(container);
    var wrap = IA.el('div', { class: 'ia-levels' }, [IA.el('h2', {}, [title || 'Choose a level'])]);
    var grid = IA.el('div', { class: 'ia-level-grid' });
    levels.forEach(function (lv) {
      grid.appendChild(IA.el('button', { class: 'ia-btn ia-level', type: 'button', onclick: function () { IA.sfx.tap(); onPick(lv.value, lv); } },
        [IA.el('strong', {}, [lv.label]), lv.desc ? IA.el('small', {}, [lv.desc]) : null]));
    });
    wrap.appendChild(grid); container.appendChild(wrap);
  };

  /* ── Round-based game loop ──────────────────────────────────── */
  /**
   * IA.game({
   *   id, title, emoji, back, instructions,
   *   rounds: 10,
   *   levels: [{label, value, desc}], levelTitle   // optional: shows a picker first
   *   round: function (r) { ... }                 // render one round into r.stage
   * })
   * r = { index, total, level, stage, shell, answer(isCorrect, el, msg) -> bool, skip() }
   *   answer(true)  → scores (if first try), celebrates, advances after a pause.
   *   answer(false) → marks a miss for this round, shakes, lets the child retry.
   */
  IA.game = function (cfg) {
    var shell = IA.setup(cfg);
    var total = cfg.rounds || 10;
    var state;
    function start(level) {
      state = { i: 0, correct: 0, level: level, missed: false, locked: false };
      next();
    }
    function next() {
      if (state.i >= total) return finish();
      state.missed = false; state.locked = false;
      shell.setProgress(state.i / total);
      shell.setScore('⭐ ' + state.correct + ' / ' + total);
      IA.clear(shell.stage);
      var r = {
        index: state.i, total: total, level: state.level, stage: shell.stage, shell: shell,
        answer: function (ok, el, msg) {
          if (state.locked) return false;
          if (ok) {
            state.locked = true;
            if (!state.missed) state.correct++;
            IA.good(el, msg);
            shell.setScore('⭐ ' + state.correct + ' / ' + total);
            setTimeout(function () { state.i++; next(); }, cfg.delay || 1100);
          } else { state.missed = true; IA.bad(el, msg); }
          return ok;
        },
        skip: function () { if (state.locked) return; state.locked = true; state.i++; next(); }
      };
      cfg.round(r);
    }
    function finish() {
      shell.setProgress(1);
      var pct = state.correct / total;
      var stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1;
      IA.setStars(cfg.id, stars);
      IA.sfx.win(); IA.confetti();
      IA.say(stars === 3 ? 'Amazing! Three stars!' : 'Great work! You finished!');
      IA.clear(shell.stage);
      shell.stage.appendChild(IA.el('div', { class: 'ia-finish' }, [
        IA.el('div', { class: 'ia-big-stars' }, ['⭐'.repeat(stars) + '☆'.repeat(3 - stars)]),
        IA.el('h2', {}, ['You got ' + state.correct + ' out of ' + total + ' on the first try!']),
        IA.el('div', { class: 'ia-row' }, [
          IA.el('button', { class: 'ia-btn primary', type: 'button', onclick: function () { start(state.level); } }, ['🔁 Play again']),
          cfg.levels ? IA.el('button', { class: 'ia-btn', type: 'button', onclick: pickLevel }, ['🎚️ Change level']) : null,
          IA.el('a', { class: 'ia-btn', href: cfg.back || '../index.html' }, ['🏠 More activities'])
        ])
      ]));
    }
    function pickLevel() {
      shell.setProgress(0); shell.setScore('');
      IA.levelPicker(shell.stage, cfg.levelTitle, cfg.levels, start);
    }
    if (cfg.levels && cfg.levels.length) pickLevel(); else start(null);
    return { restart: function () { start(state && state.level); } };
  };

  /**
   * Free-play (non-scored) activity shell (explorers, simulators, read-alongs).
   * Call shell.done(n) to record n stars (default 1) once the child has meaningfully played.
   */
  IA.freePlay = function (cfg) {
    var shell = IA.setup(cfg);
    shell.setProgress(0);
    shell.done = function (n) { IA.setStars(cfg.id, n || 1); };
    return shell;
  };

  /* ── Multiple-choice helper ─────────────────────────────────── */
  /**
   * IA.choices(r, container, options, correct, {render(opt)->Node|string, speak:bool, cls, isCorrect(opt)})
   * Renders big buttons; wires them to r.answer().
   */
  IA.choices = function (r, container, options, correct, o) {
    o = o || {};
    var grid = IA.el('div', { class: 'ia-choices ' + (o.cls || '') });
    options.forEach(function (opt) {
      var content = o.render ? o.render(opt) : String(opt);
      var b = IA.el('button', { class: 'ia-btn ia-choice', type: 'button' }, [content]);
      b.addEventListener('click', function () {
        if (o.speak) IA.say(String(opt));
        var ok = o.isCorrect ? o.isCorrect(opt) : opt === correct;
        if (!ok) b.disabled = true;
        r.answer(ok, b);
      });
      grid.appendChild(b);
    });
    container.appendChild(grid);
    return grid;
  };

  /* ── Drag & drop with tap fallback ──────────────────────────── */
  /**
   * IA.dragDrop({
   *   items: [elements] | selector, targets: [elements] | selector, root?: element,
   *   onDrop(item, target) -> boolean|void   // return false to keep item where it was
   *   accept?(item, target) -> boolean, onPick?(item), keepInPlace?: bool
   * })
   * Mouse, touch and pen via pointer events. Also: tap an item to select it, then tap a
   * target to place it. Keyboard: Enter/Space on an item selects it, on a target places it.
   * By default a successful drop appends the item into the target (unless keepInPlace).
   */
  IA.dragDrop = function (o) {
    var root = o.root || document;
    function list(x) { return typeof x === 'string' ? Array.prototype.slice.call(root.querySelectorAll(x)) : Array.prototype.slice.call(x); }
    var targets = list(o.targets);
    var selected = null;
    function select(it) {
      if (selected) selected.classList.remove('ia-selected');
      selected = (selected === it) ? null : it;
      if (selected) { selected.classList.add('ia-selected'); if (o.onPick) o.onPick(selected); IA.sfx.tap(); }
      targets.forEach(function (t) { t.classList.toggle('ia-drop-ready', !!selected); });
    }
    function drop(it, t) {
      if (o.accept && !o.accept(it, t)) { IA.bad(it); return; }
      var res = o.onDrop(it, t);
      if (res !== false && !o.keepInPlace && it.isConnected && t !== it.parentNode) t.appendChild(it);
    }
    function wireTarget(t) {
      t.classList.add('ia-drop');
      if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '0');
      function place() { if (selected) { var s = selected; select(s); drop(s, t); } }
      t.addEventListener('click', function (e) {
        if (!selected) return;
        var hitItem = e.target.closest && e.target.closest('.ia-drag');
        if (hitItem && hitItem !== t) return; // clicking another item inside the target re-selects
        e.stopPropagation(); place();
      });
      t.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && selected && e.target === t) { e.preventDefault(); place(); } });
    }
    function wireItem(it) {
      it.classList.add('ia-drag');
      it.setAttribute('tabindex', '0');
      it.setAttribute('role', 'button');
      var startX, startY, ghost = null, moved = false, pid = null;
      it.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button !== 0) return;
        if (it.classList.contains('ia-locked')) return;
        startX = e.clientX; startY = e.clientY; moved = false; pid = e.pointerId;
        try { it.setPointerCapture(pid); } catch (err) {}
      });
      it.addEventListener('pointermove', function (e) {
        if (pid !== e.pointerId) return;
        var dx = e.clientX - startX, dy = e.clientY - startY;
        if (!moved && Math.abs(dx) + Math.abs(dy) > 8) {
          moved = true;
          var r = it.getBoundingClientRect();
          ghost = it.cloneNode(true); ghost.classList.add('ia-ghost');
          ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
          ghost._ox = startX - r.left; ghost._oy = startY - r.top;
          document.body.appendChild(ghost); it.classList.add('ia-dragging');
        }
        if (moved && ghost) {
          ghost.style.left = (e.clientX - ghost._ox) + 'px'; ghost.style.top = (e.clientY - ghost._oy) + 'px';
          var over = hit(e.clientX, e.clientY);
          targets.forEach(function (t) { t.classList.toggle('ia-over', t === over); });
        }
      });
      function cleanup() { if (ghost) ghost.remove(); ghost = null; it.classList.remove('ia-dragging'); targets.forEach(function (t) { t.classList.remove('ia-over'); }); }
      it.addEventListener('pointerup', function (e) {
        if (pid !== e.pointerId) return; pid = null;
        if (moved) {
          var over = hit(e.clientX, e.clientY);
          cleanup();
          if (selected) select(selected);
          if (over) drop(it, over);
          it._suppressClick = true; setTimeout(function () { it._suppressClick = false; }, 60);
        }
      });
      it.addEventListener('pointercancel', function () { pid = null; cleanup(); });
      it.addEventListener('click', function (e) {
        if (it._suppressClick || it.classList.contains('ia-locked')) return;
        e.stopPropagation();
        // Tapping an item that already sits inside a target while another item is selected
        // means "put the selected item here", not "select this one instead".
        if (selected && selected !== it) {
          var host = null;
          targets.forEach(function (t) { if (t !== it && t.contains(it) && (!host || host.contains(t))) host = t; });
          if (host && !host.contains(selected)) { var s = selected; select(s); drop(s, host); return; }
        }
        select(it);
      });
      it.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target === it) { e.preventDefault(); e.stopPropagation(); select(it); } });
    }
    function hit(x, y) {
      var best = null;
      targets.forEach(function (t) {
        if (!t.isConnected) return;
        var r = t.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          if (!best || best.contains(t)) best = t;
        }
      });
      return best;
    }
    list(o.items).forEach(wireItem);
    targets.forEach(wireTarget);
    return {
      addItem: function (it) { wireItem(it); },
      addTarget: function (t) { targets.push(t); wireTarget(t); },
      deselect: function () { if (selected) select(selected); }
    };
  };

  /* ── Number / text input helper ─────────────────────────────── */
  /** Big input + check button. onCheck(valueString, inputEl). o: {decimal, text, width, placeholder, button, label} */
  IA.numberInput = function (container, onCheck, o) {
    o = o || {};
    var inp = IA.el('input', { class: 'ia-input', type: 'text', inputmode: o.text ? 'text' : (o.decimal ? 'decimal' : 'numeric'),
      autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': o.label || 'Your answer', placeholder: o.placeholder || '?' });
    if (o.width) inp.style.width = o.width;
    var btn = IA.el('button', { class: 'ia-btn primary', type: 'button' }, [o.button || 'Check ✔']);
    function go() { if (inp.value.trim() !== '') onCheck(inp.value.trim(), inp); }
    btn.addEventListener('click', go);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    var row = IA.el('div', { class: 'ia-row' }, [inp, btn]);
    container.appendChild(row);
    setTimeout(function () { if (!('ontouchstart' in window)) inp.focus(); }, 50);
    return inp;
  };

  /* ── Hub / index pages: show saved stars ────────────────────── */
  IA.renderHubStars = function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-activity]'), function (a) {
      var s = IA.getStars(a.getAttribute('data-activity'));
      var slot = a.querySelector('.ia-hub-stars');
      if (!slot) { slot = IA.el('span', { class: 'ia-hub-stars' }); a.appendChild(slot); }
      slot.textContent = s ? '⭐'.repeat(s) + '☆'.repeat(3 - s) : '';
    });
  };

  window.IA = IA;
})();
