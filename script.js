(() => {
  const dashboard = document.getElementById('dashboard');
  const summary = document.getElementById('summary');
  const searchInput = document.getElementById('searchInput');
  const lastUpdatedEl = document.getElementById('lastUpdated');
  let data = [];
  const state = { search: '', type: 'all', region: 'all' };

  const typeClass = (type) => {
    const lower = (type || '').toLowerCase();
    if (lower.includes('state')) return 'state';
    if (lower.includes('ransom')) return 'ransomware';
    if (lower.includes('hacktiv')) return 'hacktivist';
    return 'other';
  };

  const statusClass = (status) => {
    if (status === 'active') return 'status-active';
    if (status === 'inactive') return 'status-inactive';
    return 'status-unknown';
  };

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

  const safeUrl = (url, fallback = '#') => {
    if (typeof url !== 'string') return fallback;
    return /^https:\/\//i.test(url) ? url : fallback;
  };

  const toSearchText = (actor) => [
    actor.name,
    (actor.aliases || []).join(' '),
    actor.type,
    actor.country,
    actor.region,
    (actor.targetRegions || []).join(' '),
    (actor.targetIndustries || []).join(' '),
    (actor.ttps || []).map(t => `${t.id} ${t.name}`).join(' ')
  ].join(' ').toLowerCase();

  const filteredActors = () => data.filter((actor) => {
    if (state.type !== 'all' && typeClass(actor.type) !== state.type) return false;
    if (state.region !== 'all' && actor.region !== state.region) return false;
    if (!state.search) return true;
    return toSearchText(actor).includes(state.search);
  });

  const groupBy = (items, key) => items.reduce((acc, item) => {
    acc[item[key]] ||= [];
    acc[item[key]].push(item);
    return acc;
  }, {});

  const render = () => {
    const actors = filteredActors();
    const byRegion = groupBy(actors, 'region');
    summary.textContent = `Showing ${actors.length} threat actors across ${Object.keys(byRegion).length} regions`;
    dashboard.innerHTML = '';

    Object.keys(byRegion).sort().forEach((region) => {
      const regionActors = byRegion[region];
      const regionWrap = document.createElement('section');
      const rBtn = document.createElement('button');
      rBtn.className = 'group-toggle';
      rBtn.textContent = `${region} (${regionActors.length})`;
      const rContent = document.createElement('div');
      rContent.className = 'group-content';
      rBtn.addEventListener('click', () => rContent.classList.toggle('collapsed'));
      regionWrap.append(rBtn, rContent);

      const byCountry = groupBy(regionActors, 'country');
      Object.keys(byCountry).sort().forEach((country) => {
        const countryActors = byCountry[country];
        const cBtn = document.createElement('button');
        cBtn.className = 'group-toggle';
        cBtn.textContent = `${country} (${countryActors.length})`;
        const cContent = document.createElement('div');
        cContent.className = 'group-content';
        cBtn.addEventListener('click', () => cContent.classList.toggle('collapsed'));

        const byType = groupBy(countryActors, 'type');
        Object.keys(byType).sort().forEach((type) => {
          const typeActors = byType[type];
          const typeTitle = document.createElement('p');
          typeTitle.innerHTML = `<strong>${escapeHtml(type)}</strong> <span class="muted">(${typeActors.length})</span>`;
          cContent.appendChild(typeTitle);

          const table = document.getElementById('tableTemplate').content.firstElementChild.cloneNode(true);
          const tbody = table.querySelector('tbody');

          typeActors.forEach((actor) => {
            const tr = document.createElement('tr');
            tr.className = 'actor-row';
            tr.innerHTML = `
              <td>${escapeHtml(actor.name || '—')}</td>
              <td>${escapeHtml((actor.aliases || []).join(', ') || '—')}</td>
              <td><span class="badge ${typeClass(actor.type)}">${escapeHtml(actor.type || 'Other / Uncategorized')}</span></td>
              <td>${escapeHtml(actor.activeSince || '—')}</td>
              <td>${escapeHtml(actor.lastObserved || '—')}</td>
              <td><span class="status-dot ${statusClass(actor.status)}"></span>${escapeHtml(actor.statusLabel || 'Unknown')}</td>
              <td>${escapeHtml((actor.targetRegions || []).join(', ') || '—')}<br><span class="muted">${escapeHtml((actor.targetIndustries || []).join(', ') || '—')}</span></td>
            `;

            const detail = document.createElement('tr');
            detail.className = 'detail-row';
            detail.hidden = true;
            const ttpLinks = (actor.ttps || []).map((t) => `<a href="${safeUrl(t.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t.id)}</a> (${escapeHtml(t.name)})`).join(', ') || '—';
            const links = actor.sourceLinks || {};
            detail.innerHTML = `<td colspan="7">
              <strong>ATT&CK TTPs:</strong> ${ttpLinks}<br>
              <strong>Sources:</strong>
              <a href="${safeUrl(links.malpedia)}" target="_blank" rel="noopener noreferrer">Malpedia</a> |
              <a href="${safeUrl(links.threatcodex, 'https://threatcodex.com/')}" target="_blank" rel="noopener noreferrer">ThreatCodex</a>${links.yeti ? ` | <a href="${safeUrl(links.yeti)}" target="_blank" rel="noopener noreferrer">YETI</a>` : ''}
            </td>`;
            tr.addEventListener('click', () => { detail.hidden = !detail.hidden; });

            tbody.append(tr, detail);
          });

          cContent.appendChild(table);
        });

        rContent.append(cBtn, cContent);
      });

      dashboard.appendChild(regionWrap);
    });
  };

  const setButtonState = (container, attr, value) => {
    container.querySelectorAll('button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset[attr] === value);
    });
  };

  document.getElementById('typeFilters').addEventListener('click', (e) => {
    if (!e.target.matches('button')) return;
    state.type = e.target.dataset.type;
    setButtonState(document.getElementById('typeFilters'), 'type', state.type);
    render();
  });

  document.getElementById('regionFilters').addEventListener('click', (e) => {
    if (!e.target.matches('button')) return;
    state.region = e.target.dataset.region;
    setButtonState(document.getElementById('regionFilters'), 'region', state.region);
    render();
  });

  searchInput.addEventListener('input', () => {
    state.search = searchInput.value.trim().toLowerCase();
    render();
  });

  fetch('data/threats.json')
    .then((res) => res.json())
    .then((json) => {
      data = json.actors || [];
      lastUpdatedEl.textContent = json.lastUpdated || 'N/A';
      render();
    })
    .catch(() => {
      summary.textContent = 'Failed to load threat data.';
    });
})();
