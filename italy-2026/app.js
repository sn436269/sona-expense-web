(() => {
  const days = [...document.querySelectorAll('.day')];
  const search = document.querySelector('#search');
  const city = document.querySelector('#city');
  const pending = document.querySelector('#pending');
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('#empty');
  const normalized = value => value.toLocaleLowerCase().normalize('NFKC');
  function filter() {
    const query = normalized(search.value.trim());
    let shown = 0;
    for (const day of days) {
      const matches = (!query || normalized(day.textContent + day.dataset.date).includes(query)) && (!city.value || day.dataset.city.includes(city.value)) && (!pending.checked || day.dataset.pending === 'true');
      day.hidden = !matches;
      if (matches) {
        shown++;
        if (query || pending.checked) day.open = true;
      }
    }
    count.textContent = `顯示 ${shown} / ${days.length} 個日期`;
    empty.hidden = shown > 0;
  }
  search.addEventListener('input', filter);
  city.addEventListener('change', filter);
  pending.addEventListener('change', filter);
  document.querySelector('#expand').addEventListener('click', () => days.filter(d => !d.hidden).forEach(d => d.open = true));
  document.querySelector('#collapse').addEventListener('click', () => days.forEach(d => d.open = false));
  document.querySelector('#clear').addEventListener('click', () => {search.value = ''; city.value = ''; pending.checked = false; filter();});
  function followHash() {
    const id = location.hash.slice(1);
    const target = document.getElementById(id);
    if (!target || !target.classList.contains('day')) return;
    if (target.hidden) {search.value = ''; city.value = ''; pending.checked = false; filter();}
    target.open = true;
    document.querySelectorAll('.date-rail a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${id}`));
    requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
  }
  document.querySelectorAll('.date-rail a').forEach(a => a.addEventListener('click', () => {
    const target = document.getElementById(a.hash.slice(1));
    if (target.hidden) {search.value = ''; city.value = ''; pending.checked = false; filter();}
    target.open = true;
    if (location.hash === a.hash) followHash();
  }));
  window.addEventListener('hashchange', followHash);
  let printState;
  window.addEventListener('beforeprint', () => {printState=[...document.querySelectorAll('details')].map(el=>({el,open:el.open}));printState.forEach(({el})=>el.open=true);});
  window.addEventListener('afterprint', () => {printState?.forEach(({el,open})=>el.open=open);});
  document.querySelector('#print').addEventListener('click', () => window.print());
  filter();
  followHash();
})();
