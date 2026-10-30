(() => {
  'use strict';
  const strips = [...document.querySelectorAll('.slot-reference')];
  function arrange(strip) {
    const slot = strip.closest('.slot');
    if (!slot.closest('.day').open || !slot.getClientRects().length) return;
    const box = slot.getBoundingClientRect();
    const links = [...strip.children];
    links.forEach(a => a.hidden = true);
    strip.hidden = true;
    const textRects = [...slot.querySelectorAll('h4,p')].flatMap(el => {
      const r = document.createRange(); r.selectNodeContents(el); return [...r.getClientRects()];
    });
    // Measure only existing whitespace. Never reflow text or change the row's dimensions.
    const candidates = [];
    for (let height = Math.min(64, Math.floor(box.height - 18)); height >= 32; height -= 4) {
      candidates.push({height, top:box.top + (box.height - height) / 2});
    }
    // A long paragraph can fill the full row width: use the title line's empty right end.
    const heading = slot.querySelector('h4').getBoundingClientRect();
    candidates.push({height:Math.min(28, heading.height), top:heading.top});
    for (const {height, top} of candidates) {
      const width = Math.round(height * 1.5), gap = 6;
      const occupied = Math.max(box.left + 100, ...textRects.filter(r => r.bottom > top && r.top < top + height).map(r => r.right));
      const available = Math.min(300, box.right - occupied - 14);
      const count = Math.min(links.length, Math.floor((available + gap) / (width + gap)));
      if (count <= 0) continue;
      strip.style.setProperty('--reference-width', width + 'px');
      strip.style.setProperty('--reference-height', height + 'px');
      strip.style.top = (top - box.top) + 'px';
      strip.style.transform = 'none';
      links.slice(0, count).forEach(a => a.hidden = false);
      strip.hidden = false;
      break;
    }
  }
  let queued = false;
  function refresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; strips.forEach(arrange); });
  }
  new ResizeObserver(refresh).observe(document.querySelector('.journal'));
  document.querySelectorAll('.day').forEach(day => day.addEventListener('toggle', refresh));
  window.addEventListener('resize', refresh);
  document.fonts.ready.then(refresh);
  strips.forEach(strip => strip.querySelectorAll('img').forEach(img => img.addEventListener('error', () => {
    img.parentElement.remove(); refresh();
  })));
  refresh();
})();
