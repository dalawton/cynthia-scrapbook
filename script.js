/* Cynthia J. Smith scrapbook. Plain JavaScript, no libraries, no build step. */
(() => {
  'use strict';

  const CFG = Object.assign(
    { name: '', lifespan: '', tagline: '', dedication: '', portrait: '', sheetCsvUrl: '', formUrl: '' },
    window.SCRAPBOOK_CONFIG || {}
  );
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = window.matchMedia('(max-width: 820px)');
  const $ = (s) => document.querySelector(s);

  /* Everything user-written goes in with textContent, never innerHTML,
     so a submission can't inject code into the page. */
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null && text !== '') n.textContent = text;
    return n;
  };

  const hash = (str) => {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return h >>> 0;
  };

  /* ---------- data ---------- */
  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
        else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  // Turns Google Drive share/upload links into an image URL the page can show.
  function photoUrl(raw) {
    if (!raw) return '';
    const u = String(raw).split(/,\s+/)[0].trim();
    if (!/^https?:\/\//i.test(u)) return '';
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=|thumbnail\?(?:[^#]*&)?id=)([\w-]+)/);
    return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1600` : u;
  }

  function normalize(raw) {
    const g = (k) => String(raw[k] == null ? '' : raw[k]).trim();
    const photo = photoUrl(g('photo'));
    let type = g('type').toLowerCase();
    if (!['photo', 'quote', 'memory'].includes(type)) type = photo ? 'photo' : 'memory';
    const title = g('title'), description = g('description');
    if (!title && !description && !photo) return null;
    const order = parseFloat(g('order'));
    return {
      id: hash(type + title + description + g('photo')).toString(36),
      type, title, description, photo,
      name: g('name'), relationship: g('relationship'), year: g('year'),
      order: isFinite(order) ? order : Infinity
    };
  }

  function prepare(list) {
    const seen = new Set();
    return list.map(normalize).filter(Boolean)
      .filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)))
      .map((it, i) => [it, i])
      .sort((a, b) => (a[0].order - b[0].order) || (a[1] - b[1]))
      .map((p) => p[0]);
  }

  async function load() {
    const fallback = window.SCRAPBOOK_ITEMS || [];
    if (!CFG.sheetCsvUrl) return { list: fallback, failed: false };
    try {
      const res = await fetch(CFG.sheetCsvUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const rows = parseCSV(await res.text());
      const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
      const list = rows.map((r) => { const o = {}; head.forEach((h, i) => { o[h] = r[i]; }); return o; });
      return { list, failed: false };
    } catch (err) {
      console.warn('Could not load the sheet; showing saved pages.', err);
      return { list: fallback, failed: true };
    }
  }

  /* ---------- state ---------- */
  let items = [], pages = [], cur = 0, single = false, animating = false;
  let openIdx = -1, lastBtn = null;

  const pagesBox = $('#pages'), slotL = $('#slotL'), slotR = $('#slotR');
  const prevBtn = $('#prev'), nextBtn = $('#next'), where = $('#where');
  const focusEl = $('#focus'), card = $('#focusCard'), media = $('#focusMedia'), text = $('#focusText');
  const step = () => (single ? 1 : 2);

  /* ---------- building pages ---------- */
  function imgEl(src, alt) {
    const img = new Image();
    img.alt = alt || '';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => {
      const holder = img.parentElement;
      img.remove();
      if (holder) { holder.classList.add('empty'); holder.appendChild(el('span', null, 'photo unavailable')); }
    });
    img.src = src;
    return img;
  }

  function photoHolder(src, alt) {
    const holder = el('div', 'photo');
    if (src) holder.appendChild(imgEl(src, alt));
    else { holder.classList.add('empty'); holder.appendChild(el('span', null, 'photo')); }
    return holder;
  }

  function itemButton(it) {
    const b = el('button', 'item item-' + it.type);
    b.type = 'button';
    b.dataset.id = it.id;
    const h = hash(it.id);
    b.style.setProperty('--tilt', (((h % 61) - 30) / 10) + 'deg');
    b.style.setProperty('--nx', ((h >>> 5) % 9 - 4) + 'px');
    b.style.setProperty('--ny', ((h >>> 9) % 9 - 4) + 'px');
    b.setAttribute('aria-label', 'Open ' + it.type + (it.title ? ': ' + it.title : ''));

    if (it.type === 'photo') {
      const fig = el('figure', 'polaroid');
      fig.append(el('span', 'tape'), photoHolder(it.photo, it.title), el('figcaption', null, it.title));
      b.appendChild(fig);
    } else if (it.type === 'quote') {
      const q = el('div', 'quote-card');
      q.append(el('span', 'tape'), el('blockquote', null, '“' + (it.title || it.description) + '”'));
      if (it.name) q.appendChild(el('cite', null, it.name));
      b.appendChild(q);
    } else {
      const n = el('div', 'note-card');
      n.append(el('span', 'tape'), el('h3', null, it.title));
      if (it.description) n.appendChild(el('p', null, it.description.replace(/\s+/g, ' ')));
      if (it.name) n.appendChild(el('div', 'by', it.name));
      b.appendChild(n);
    }
    return b;
  }

  function fillTitle(page) {
    const wrap = el('div', 'title-page');
    const fig = el('figure', 'polaroid portrait');
    fig.append(el('span', 'tape'), photoHolder(CFG.portrait, CFG.name));
    [fig, el('h2', 'name', CFG.name), el('p', 'lifespan', CFG.lifespan), el('p', 'tagline', CFG.tagline),
      el('p', 'dedication', CFG.dedication),
      el('p', 'hint', 'Turn the pages. Select any photo, quote, or memory to look closer.')
    ].forEach((n) => { if (n.textContent || n.tagName === 'FIGURE') wrap.appendChild(n); });
    page.appendChild(wrap);
  }

  function fillItems(page, list) {
    const grid = el('div', 'grid');
    list.forEach((it) => { const cell = el('div', 'cell'); cell.appendChild(itemButton(it)); grid.appendChild(cell); });
    page.appendChild(grid);
  }

  function fillAdd(page) {
    const w = el('div', 'add-page');
    w.appendChild(el('h2', 'name', 'Add to the book'));
    if (!items.length) w.appendChild(el('p', null, 'The first pages are still empty. You could be the one to fill them.'));
    w.appendChild(el('p', null, 'Share a photo, a favorite quote, or a memory of ' + (CFG.name || 'her') + '.'));
    w.appendChild(el('p', null, 'A caretaker of this book reads every submission before it appears on a page.'));
    if (CFG.formUrl) {
      const a = el('a', 'btn solid', 'Share a memory');
      a.href = CFG.formUrl; a.target = '_blank'; a.rel = 'noopener';
      w.appendChild(a);
    } else w.appendChild(el('p', 'hint', 'Submissions open soon.'));
    page.appendChild(w);
  }

  function pageNode(p, side, idx) {
    const page = el('section', 'page ' + side);
    if (!p) { page.classList.add('blank'); return page; }
    if (p.kind === 'title') fillTitle(page);
    else if (p.kind === 'items') fillItems(page, p.items);
    else fillAdd(page);
    page.appendChild(el('span', 'pageno', String(idx + 1)));
    return page;
  }

  function buildPages() {
    const per = single ? 2 : 4;
    pages = [{ kind: 'title' }];
    for (let i = 0; i < items.length; i += per) pages.push({ kind: 'items', items: items.slice(i, i + per) });
    pages.push({ kind: 'add' });
  }

  function renderSpread() {
    slotL.replaceChildren();
    slotR.replaceChildren();
    if (single) slotR.appendChild(pageNode(pages[cur], 'right', cur));
    else {
      slotL.appendChild(pageNode(pages[cur], 'left', cur));
      slotR.appendChild(pageNode(pages[cur + 1], 'right', cur + 1));
    }
    updateControls();
  }

  function updateControls() {
    prevBtn.disabled = cur <= 0;
    nextBtn.disabled = cur + step() >= pages.length;
    const last = Math.min(cur + step(), pages.length);
    where.textContent = single || last === cur + 1
      ? `Page ${cur + 1} of ${pages.length}`
      : `Pages ${cur + 1}–${last} of ${pages.length}`;
  }

  function anchorId() {
    for (const p of [pages[cur], pages[cur + 1]]) if (p && p.kind === 'items') return p.items[0].id;
    return null;
  }

  function pageIndexOf(id) {
    const i = pages.findIndex((p) => p.kind === 'items' && p.items.some((it) => it.id === id));
    return i < 0 ? -1 : (single ? i : i - (i % 2));
  }

  function rebuild() {
    const anchor = anchorId();
    buildPages();
    cur = 0;
    if (anchor) { const t = pageIndexOf(anchor); if (t >= 0) cur = t; }
    pagesBox.classList.toggle('single', single);
    renderSpread();
  }

  /* ---------- turning pages ---------- */
  function go(dir) {
    if (animating) return;
    const next = cur + dir * step();
    if (next < 0 || next >= pages.length) return;

    if (reduce.matches) { cur = next; renderSpread(); return; }
    animating = true;

    if (single) {
      cur = next; renderSpread();
      const a = slotR.animate(
        [{ opacity: 0, transform: `translateX(${dir * 40}px)` }, { opacity: 1, transform: 'none' }],
        { duration: 260, easing: 'ease-out' });
      a.onfinish = a.oncancel = () => { animating = false; };
      return;
    }

    const leaf = el('div', 'leaf');
    const front = el('div', 'face front'), back = el('div', 'face back');
    leaf.append(front, back);
    let from, to;
    if (dir > 0) {                       // turn forward: right page lifts and lands on the left
      front.appendChild(pageNode(pages[cur + 1], 'right', cur + 1));
      back.appendChild(pageNode(pages[next], 'left', next));
      slotR.replaceChildren(pageNode(pages[next + 1], 'right', next + 1));
      from = 0; to = -180;
    } else {                             // turn back: left page lifts and lands on the right
      front.appendChild(pageNode(pages[next + 1], 'right', next + 1));
      back.appendChild(pageNode(pages[cur], 'left', cur));
      slotL.replaceChildren(pageNode(pages[next], 'left', next));
      from = -180; to = 0;
    }
    pagesBox.appendChild(leaf);
    const a = leaf.animate(
      [{ transform: `rotateY(${from}deg)` }, { transform: `rotateY(${to}deg)` }],
      { duration: 780, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'forwards' });
    a.onfinish = () => {
      if (dir > 0) slotL.replaceChildren(pageNode(pages[next], 'left', next));
      else slotR.replaceChildren(pageNode(pages[next + 1], 'right', next + 1));
      cur = next;
      updateControls();
      leaf.remove();
      animating = false;
    };
  }

  /* ---------- opened item ---------- */
  function fillFocus(it) {
    media.replaceChildren();
    text.replaceChildren();
    card.classList.toggle('no-media', it.type === 'memory');
    focusEl.setAttribute('aria-label', it.type === 'quote' ? 'Quote' : (it.title || 'Scrapbook item'));

    if (it.type === 'photo') {
      const fig = el('figure', 'focus-photo');
      fig.append(el('span', 'tape'), photoHolder(it.photo, it.title));
      media.appendChild(fig);
    } else if (it.type === 'quote') {
      media.appendChild(el('blockquote', 'focus-quote', '“' + (it.title || it.description) + '”'));
    }

    if (it.type !== 'quote' && it.title) text.appendChild(el('h2', null, it.title));
    const by = [it.name, it.relationship].filter(Boolean).join(', ');
    if (by) text.appendChild(el('p', 'focus-by', 'Shared by ' + by));
    if (it.year) text.appendChild(el('p', 'focus-year', it.year));
    const desc = el('div', 'focus-desc');
    const body = it.type === 'quote' && !it.title ? '' : it.description;
    body.split(/\n+/).map((s) => s.trim()).filter(Boolean).forEach((s) => desc.appendChild(el('p', null, s)));
    text.appendChild(desc);
    card.scrollTop = 0;
  }

  function animateFrom(btn) {
    if (reduce.matches || !btn) return;
    const r = btn.getBoundingClientRect(), c = card.getBoundingClientRect();
    if (!r.width || !c.width) return;
    const s = Math.max(0.2, Math.min(r.width / c.width, r.height / c.height));
    const dx = (r.left + r.width / 2) - (c.left + c.width / 2);
    const dy = (r.top + r.height / 2) - (c.top + c.height / 2);
    card.animate(
      [{ transform: `translate(${dx}px,${dy}px) scale(${s}) rotate(-3deg)`, opacity: 0.2 }, { transform: 'none', opacity: 1 }],
      { duration: 420, easing: 'cubic-bezier(.2,.9,.25,1)' });
  }

  function showItemPage(id) {
    const t = pageIndexOf(id);
    if (t >= 0 && t !== cur) { cur = t; renderSpread(); }
  }

  function openItem(id, srcBtn) {
    const idx = items.findIndex((it) => it.id === id);
    if (idx < 0) return;
    const wasOpen = !focusEl.hidden;
    openIdx = idx;
    fillFocus(items[idx]);
    focusEl.hidden = false;
    document.body.classList.add('locked');
    if (!wasOpen) { lastBtn = srcBtn || null; animateFrom(srcBtn); $('#focusClose').focus(); }
    else if (!reduce.matches) card.animate([{ opacity: 0.3, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 220 });
    history.replaceState(null, '', '#m-' + id);
  }

  function stepItem(d) {
    if (!items.length) return;
    openItem(items[(openIdx + d + items.length) % items.length].id);
  }

  function closeFocus() {
    if (focusEl.hidden) return;
    const id = items[openIdx] && items[openIdx].id;
    focusEl.hidden = true;
    document.body.classList.remove('locked');
    history.replaceState(null, '', location.pathname + location.search);
    if (id) {
      showItemPage(id);
      const b = pagesBox.querySelector('.item[data-id="' + id + '"]') || lastBtn;
      if (b && document.contains(b)) b.focus({ preventScroll: true });
    }
  }

  /* ---------- events ---------- */
  pagesBox.addEventListener('click', (e) => {
    const b = e.target.closest('.item');
    if (b) openItem(b.dataset.id, b);
  });
  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  $('#focusClose').addEventListener('click', closeFocus);
  $('#focusPrev').addEventListener('click', () => stepItem(-1));
  $('#focusNext').addEventListener('click', () => stepItem(1));
  focusEl.addEventListener('click', (e) => {
    if (e.target === focusEl || e.target.classList.contains('focus-backdrop')) closeFocus();
  });

  document.addEventListener('keydown', (e) => {
    if (!focusEl.hidden) {
      if (e.key === 'Escape') closeFocus();
      else if (e.key === 'ArrowRight') stepItem(1);
      else if (e.key === 'ArrowLeft') stepItem(-1);
      else if (e.key === 'Tab') {
        const f = [...focusEl.querySelectorAll('button, a[href]')].filter((n) => n.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      return;
    }
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
  });

  let sx = null;
  pagesBox.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  pagesBox.addEventListener('touchend', (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    sx = null;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
  }, { passive: true });

  narrow.addEventListener('change', () => { single = narrow.matches; rebuild(); });

  /* ---------- start ---------- */
  async function init() {
    document.title = 'Remembering ' + CFG.name;
    $('#siteName').textContent = CFG.name;
    $('#footText').textContent = 'In loving memory of ' + CFG.name;
    if (CFG.formUrl) { const a = $('#addLink'); a.href = CFG.formUrl; a.hidden = false; }

    single = narrow.matches;
    const { list, failed } = await load();
    items = prepare(list);
    rebuild();
    $('#book').classList.add('ready');
    const status = $('#status');
    status.classList.add('note');
    status.textContent = failed ? 'The latest pages could not be loaded, so older ones are showing. Try again in a few minutes.' : '';

    const m = location.hash.match(/^#m-([\w]+)$/);
    if (m && items.some((it) => it.id === m[1])) { showItemPage(m[1]); openItem(m[1], pagesBox.querySelector('.item[data-id="' + m[1] + '"]')); }
  }
  init();
})();
