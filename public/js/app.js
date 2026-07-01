/**
 * Application controller: loads data from the API, drives the globe, the
 * dashboard, the search box, and the detail views.
 */
(function () {
  const dashboardEl = document.getElementById('dashboard');
  const detailEl = document.getElementById('detail');
  const statGrid = document.getElementById('stat-grid');
  const classificationList = document.getElementById('classification-list');
  const countryList = document.getElementById('country-list');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const panel = document.getElementById('panel');
  const legendTarget = document.getElementById('legend-target');
  const clockTime = document.getElementById('clock-time');
  const clockDate = document.getElementById('clock-date');

  let globe;

  // ---- helpers ---------------------------------------------------------
  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));
  }

  function valueOrDash(v) {
    return v && String(v).trim() ? escapeHtml(v) : '<span class="muted">—</span>';
  }

  function showDashboard() {
    detailEl.hidden = true;
    detailEl.innerHTML = '';
    dashboardEl.hidden = false;
    panel.scrollTop = 0;
    if (globe) globe.clearTargets();
    legendTarget.hidden = true;
  }

  function showDetail(html) {
    dashboardEl.hidden = true;
    detailEl.innerHTML = html;
    detailEl.hidden = false;
    panel.scrollTop = 0;
  }

  // ---- dashboard -------------------------------------------------------
  function renderDashboard(stats, countries) {
    const cards = [
      { value: stats.totalActors, label: 'Threat actors tracked' },
      { value: stats.originCountries, label: 'Origin countries' },
      { value: stats.targetedRegions, label: 'Targeted regions' },
    ];
    statGrid.innerHTML = cards
      .map(
        (c) => `
        <div class="stat-card">
          <div class="stat-value">${escapeHtml(c.value)}</div>
          <div class="stat-label">${escapeHtml(c.label)}</div>
        </div>`
      )
      .join('');

    const maxClass = Math.max(1, ...stats.classifications.map((c) => c.count));
    classificationList.innerHTML = stats.classifications
      .map(
        (c) => `
        <div class="bar-row">
          <div class="bar-head">
            <span>${escapeHtml(c.name)}</span>
            <span class="bar-count">${c.count}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${(c.count / maxClass) * 100}%"></div>
          </div>
        </div>`
      )
      .join('');

    countryList.innerHTML = countries
      .map(
        (c) => `
        <li data-country="${escapeHtml(c.country)}">
          <span class="c-name">${escapeHtml(c.country)}</span>
          <span class="c-count">${c.count}</span>
        </li>`
      )
      .join('');

    countryList.querySelectorAll('li').forEach((li) => {
      li.addEventListener('click', () => openCountry(li.dataset.country));
    });
  }

  // ---- country view ----------------------------------------------------
  async function openCountry(country) {
    if (globe) globe.clearTargets();
    legendTarget.hidden = true;
    const actors = await api.actorsByCountry(country);
    const cards = actors
      .map((actor) => {
        const aliases = actor.aliases.map((a) => a.name).slice(0, 4).join(', ');
        return `
        <div class="actor-card" data-id="${escapeHtml(actor.id)}">
          <div class="ac-top">
            <span class="ac-name">${escapeHtml(actor.id)}</span>
            ${actor.status ? `<span class="badge status">${escapeHtml(actor.status)}</span>` : ''}
          </div>
          ${aliases ? `<div class="ac-aliases">a.k.a. ${escapeHtml(aliases)}${actor.aliases.length > 4 ? '…' : ''}</div>` : ''}
        </div>`;
      })
      .join('');

    showDetail(`
      <button class="back-btn" id="back-btn">← Dashboard</button>
      <div class="detail-head">
        <h2>${escapeHtml(country)}</h2>
        <p class="origin">${actors.length} threat ${actors.length === 1 ? 'actor' : 'actors'} originating here</p>
      </div>
      ${cards || '<p class="muted">No threat actors found.</p>'}
    `);

    detailEl.querySelector('#back-btn').addEventListener('click', showDashboard);
    detailEl.querySelectorAll('.actor-card').forEach((card) => {
      card.addEventListener('click', () => openActor(card.dataset.id, country));
    });
  }

  // ---- actor detail ----------------------------------------------------
  async function openActor(id, fromCountry) {
    const actor = await api.actor(id);
    if (!actor) return;

    // Light up this actor's targeted regions on the globe.
    if (globe) globe.setTargets(actor.targetedCountries);
    legendTarget.hidden = actor.targetedCountries.length === 0;

    const aliasChips = actor.aliases.length
      ? `<div class="chips">${actor.aliases
          .map((a) => `<span class="chip">${escapeHtml(a.name)}</span>`)
          .join('')}</div>`
      : '<p class="muted">No known aliases.</p>';

    const targetCountries = actor.targetedCountries.length
      ? `<div class="chips">${actor.targetedCountries
          .map((c) => `<span class="chip">${escapeHtml(c)}</span>`)
          .join('')}</div>`
      : '<p class="muted">—</p>';

    const industries = actor.targetedIndustries.length
      ? `<div class="chips">${actor.targetedIndustries
          .map((c) => `<span class="chip">${escapeHtml(c)}</span>`)
          .join('')}</div>`
      : '<p class="muted">—</p>';

    const ttps = actor.ttps.length
      ? `<div class="ttp-list">${actor.ttps
          .map(
            (t) => `
          <div class="ttp">
            <span class="ttp-id">${escapeHtml(t.id || '—')}</span>
            <span class="ttp-name">${escapeHtml(t.name)}</span>
          </div>`
          )
          .join('')}</div>`
      : '<p class="muted">—</p>';

    const backLabel = fromCountry ? `← ${escapeHtml(fromCountry)}` : '← Dashboard';
    const backHandler = fromCountry ? () => openCountry(fromCountry) : showDashboard;

    showDetail(`
      <button class="back-btn" id="back-btn">${backLabel}</button>
      <div class="detail-head">
        <h2>${escapeHtml(actor.id)}</h2>
        <p class="origin">Origin: ${valueOrDash(actor.country)}</p>
        <div class="chips">
          ${actor.classification ? `<span class="badge classification">${escapeHtml(actor.classification)}</span>` : ''}
          ${actor.status ? `<span class="badge status">${escapeHtml(actor.status)}</span>` : ''}
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <div class="m-label">Active since</div>
          <div class="m-value">${valueOrDash(actor.activeSince)}</div>
        </div>
        <div class="meta-item">
          <div class="m-label">Last observed</div>
          <div class="m-value">${valueOrDash(actor.lastObserved)}</div>
        </div>
      </div>

      <div class="section-title">Aliases</div>
      ${aliasChips}

      <div class="section-title">Targeted countries / regions</div>
      ${targetCountries}

      <div class="section-title">Targeted industries</div>
      ${industries}

      <div class="section-title">ATT&CK techniques</div>
      ${ttps}
    `);

    detailEl.querySelector('#back-btn').addEventListener('click', backHandler);
  }

  // ---- search ----------------------------------------------------------
  let searchTimer;

  function renderSearchResults(results) {
    if (!results.length) {
      searchResults.innerHTML = '<li class="empty">No matches found</li>';
      searchResults.classList.add('open');
      return;
    }
    searchResults.innerHTML = results
      .map((actor) => {
        const aliases = actor.aliases.map((a) => a.name).slice(0, 3).join(', ');
        return `
        <li data-id="${escapeHtml(actor.id)}" role="option">
          <div>
            <div class="res-name">${escapeHtml(actor.id)}</div>
            ${aliases ? `<div class="res-sub">a.k.a. ${escapeHtml(aliases)}</div>` : ''}
          </div>
          <span class="res-flag">${escapeHtml(actor.country)}</span>
        </li>`;
      })
      .join('');
    searchResults.classList.add('open');

    searchResults.querySelectorAll('li[data-id]').forEach((li) => {
      li.addEventListener('click', () => {
        closeSearch();
        searchInput.value = li.dataset.id;
        openActor(li.dataset.id);
      });
    });
  }

  function closeSearch() {
    searchResults.classList.remove('open');
  }

  function onSearchInput() {
    const q = searchInput.value.trim();
    clearTimeout(searchTimer);
    if (!q) {
      closeSearch();
      return;
    }
    searchTimer = setTimeout(async () => {
      try {
        const results = await api.search(q);
        renderSearchResults(results);
      } catch (err) {
        console.error(err);
      }
    }, 160);
  }

  searchInput.addEventListener('input', onSearchInput);
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) onSearchInput();
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search')) closeSearch();
  });

  // ---- bootstrap -------------------------------------------------------
  function startClock() {
    const tick = () => {
      const now = new Date();
      clockTime.textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      clockDate.textContent = now.toLocaleDateString([], {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });
    };
    tick();
    setInterval(tick, 1000);
  }

  async function init() {
    startClock();
    globe = new ThreatGlobe(document.getElementById('globe'), {
      onCountryClick: openCountry,
    });
    await globe.load();

    const [stats, countries] = await Promise.all([api.stats(), api.countries()]);
    globe.setActiveCountries(countries);
    renderDashboard(stats, countries);
  }

  init().catch((err) => {
    console.error(err);
  });
})();
