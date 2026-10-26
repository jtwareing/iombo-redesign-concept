// Maydle: a daily "guess the bird" game for the concept (in WordPress this would sit in a Custom HTML block or a small plugin)
(function () {
  var root = document.getElementById('maydle');
  if (!root || typeof MAYDLE_BIRDS === 'undefined') return;

  var MAX = 6;
  var BIRDS = MAYDLE_BIRDS.map(function (b, i) {
    return { id: i, name: b[0], alt: b[1] ? b[1].split('|') : [], order: b[2], family: b[3], wing: b[4], status: b[5], last: b[6], committee: b[7] || 'None', level: b[8] };
  });

  // Daily answers skip vagrants and rare visitors, so the mystery bird is one observers have a fair chance of knowing.
  var POOL = BIRDS.filter(function (b) { return b.level >= 2; });
  var rand = mulberry(1934);
  for (var i = POOL.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = POOL[i]; POOL[i] = POOL[j]; POOL[j] = t; }

  var input = document.getElementById('maydle-input');
  var list = document.getElementById('maydle-suggest');
  var form = document.getElementById('maydle-form');
  var rows = document.getElementById('maydle-rows');
  var result = document.getElementById('maydle-result');
  var status = document.getElementById('maydle-status');
  var modeLabel = document.getElementById('maydle-mode');
  var statsEl = document.getElementById('maydle-stats');

  var today = londonDate();
  var practice = false;
  var answer, guesses, active = -1, matches = [];

  function mulberry(a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function londonDate() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function dayNo(d) { return Math.floor(Date.parse(d + 'T00:00:00Z') / 86400000); }
  function load(key, fallback) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function start(isPractice) {
    practice = isPractice;
    if (practice) {
      answer = POOL[Math.floor(Math.random() * POOL.length)];
      guesses = [];
    } else {
      answer = POOL[((dayNo(today) % POOL.length) + POOL.length) % POOL.length];
      guesses = (load('maydle-day', {})[today] || []).filter(function (id) { return BIRDS[id]; });
    }
    modeLabel.textContent = practice ? 'Practice round' : 'Today’s bird, ' + today.split('-').reverse().join('/');
    render();
  }

  // Each clue: g = match, y = close, x = no match. Arrows point towards the answer.
  function arrow(g, a) { return g === a ? '' : (a > g ? ' ▲' : ' ▼'); }
  function size(g, a, exact, near) {
    var d = Math.abs(g - a);
    return d <= exact ? 'g' : (d <= a * near ? 'y' : 'x');
  }
  function near(g, a, n) { return g === a ? 'g' : (Math.abs(g - a) <= n ? 'y' : 'x'); }
  function compare(g, a) {
    return [
      { c: g.order === a.order ? 'g' : 'x', v: g.order },
      { c: g.family === a.family ? 'g' : (g.order === a.order ? 'y' : 'x'), v: g.family },
      { c: size(g.wing, a.wing, 2, 0.2), v: g.wing + ' cm' + arrow(g.wing, a.wing) },
      { c: near(g.level, a.level, 1), v: g.status + arrow(g.level, a.level) },
      { c: near(g.last, a.last, 2), v: g.last + arrow(g.last, a.last) },
      { c: g.committee === a.committee ? 'g' : 'x', v: g.committee }
    ];
  }

  function render() {
    var won = guesses.indexOf(answer.id) > -1;
    var over = won || guesses.length >= MAX;
    rows.innerHTML = guesses.length ? guesses.map(function (id) {
      var g = BIRDS[id];
      var cells = compare(g, answer);
      return '<tr><th scope="row" class="' + (id === answer.id ? 'g' : '') + '">' + esc(g.name) + '</th>' +
        cells.map(function (c) { return '<td class="' + c.c + '">' + esc(c.v) + '</td>'; }).join('') + '</tr>';
    }).join('') : '<tr><td colspan="7" class="empty">No guesses yet. Try a bird you saw on your last stay.</td></tr>';

    form.hidden = over;
    status.textContent = over ? '' : 'Guess ' + (guesses.length + 1) + ' of ' + MAX;

    if (over) {
      result.hidden = false;
      result.innerHTML = '<h2>' + (won ? 'Well spotted!' : 'Not this time') + '</h2>' +
        '<p>' + (won ? 'You found it in ' + guesses.length + (guesses.length === 1 ? ' guess.' : ' guesses.') : 'The answer was') +
        ' <strong>' + esc(answer.name) + '</strong>: ' + esc(answer.status.toLowerCase()) + ' on the island, last recorded in ' + answer.last + ' (checklist to the end of 2018).</p>' +
        '<div class="btn-row">' +
        (practice ? '' : '<button type="button" class="btn btn-primary" id="maydle-share">Copy my result</button>') +
        '<button type="button" class="btn btn-outline" id="maydle-practice">Play a practice round</button>' +
        '<a class="text-link" href="sightings.html">Latest Bird News</a></div>' +
        (practice ? '' : '<p class="note">A new bird every day at midnight (UK time).</p>');
      var share = document.getElementById('maydle-share');
      if (share) share.addEventListener('click', copyResult);
      document.getElementById('maydle-practice').addEventListener('click', function () { start(true); input.focus(); });
    } else {
      result.hidden = true;
    }
    renderStats();
  }

  function renderStats() {
    var s = load('maydle-stats', { played: 0, won: 0, streak: 0 });
    statsEl.textContent = 'Played ' + s.played + ' · Won ' + s.won + ' · Current streak ' + s.streak;
  }

  function finishDay(won) {
    var s = load('maydle-stats', { played: 0, won: 0, streak: 0, last: '' });
    if (s.last === today) return;
    s.played++; if (won) s.won++;
    var y = new Date(Date.parse(today + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
    s.streak = won ? (s.lastWin === y ? s.streak + 1 : 1) : 0;
    if (won) s.lastWin = today;
    s.last = today;
    save('maydle-stats', s);
  }

  function guess(bird) {
    if (!bird || guesses.indexOf(bird.id) > -1) return;
    guesses.push(bird.id);
    if (!practice) {
      var all = {}; all[today] = guesses; save('maydle-day', all);
      var won = bird.id === answer.id;
      if (won || guesses.length >= MAX) finishDay(won);
    }
    input.value = ''; closeList(); render();
    if (!form.hidden) input.focus(); else result.focus();
  }

  function copyResult() {
    var marks = { g: '🟩', y: '🟨', x: '⬜' };
    var won = guesses.indexOf(answer.id) > -1;
    var text = 'Maydle ' + today + ' ' + (won ? guesses.length : 'X') + '/' + MAX + '\n' +
      guesses.map(function (id) { return compare(BIRDS[id], answer).map(function (c) { return marks[c.c]; }).join(''); }).join('\n');
    var btn = document.getElementById('maydle-share');
    function done() { btn.textContent = 'Copied'; }
    try { navigator.clipboard.writeText(text).then(done, function () { btn.textContent = 'Could not copy'; }); }
    catch (e) { btn.textContent = 'Could not copy'; }
  }

  // Suggestions: match the start of any word in the name or its other names.
  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    return BIRDS.filter(function (b) {
      if (guesses.indexOf(b.id) > -1) return false;
      return [b.name].concat(b.alt).some(function (n) {
        n = n.toLowerCase();
        return n.indexOf(q) === 0 || n.indexOf(' ' + q) > -1 || n.indexOf('-' + q) > -1 || n.indexOf('/' + q) > -1;
      });
    }).slice(0, 8);
  }
  function openList() {
    matches = search(input.value); active = matches.length ? 0 : -1;
    if (!matches.length) { closeList(); return; }
    list.innerHTML = matches.map(function (b, i) {
      var also = b.alt.length ? ' <span>(' + esc(b.alt.join(', ')) + ')</span>' : '';
      return '<li role="option" id="maydle-opt-' + i + '"' + (i === active ? ' aria-selected="true"' : '') + ' data-i="' + i + '">' + esc(b.name) + also + '</li>';
    }).join('');
    list.hidden = false; input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-activedescendant', 'maydle-opt-' + active);
  }
  function closeList() { list.hidden = true; list.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
  function setActive(n) {
    if (!matches.length) return;
    active = (n + matches.length) % matches.length;
    [].forEach.call(list.children, function (li, i) { li.toggleAttribute('aria-selected', i === active); });
    input.setAttribute('aria-activedescendant', 'maydle-opt-' + active);
  }

  input.addEventListener('input', openList);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) openList(); else setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Escape') closeList();
  });
  list.addEventListener('mousedown', function (e) {
    var li = e.target.closest('li'); if (!li) return;
    e.preventDefault(); guess(matches[+li.getAttribute('data-i')]);
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (active > -1 && matches[active]) { guess(matches[active]); return; }
    var q = input.value.trim().toLowerCase();
    var exact = BIRDS.filter(function (b) { return [b.name].concat(b.alt).some(function (n) { return n.toLowerCase() === q; }); })[0];
    if (exact) guess(exact); else status.textContent = 'Pick a bird from the list (it must be on the Isle of May checklist).';
  });
  document.addEventListener('click', function (e) { if (!root.contains(e.target)) closeList(); });

  start(false);
})();
