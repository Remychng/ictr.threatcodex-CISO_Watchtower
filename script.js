const tableBody = document.getElementById('threat-table-body');
const searchInput = document.getElementById('search');
const summary = document.getElementById('summary');

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderRows = (items) => {
  summary.textContent = `${items.length} active threat group(s) shown`;

  tableBody.innerHTML = items
    .map((item) => {
      const sourceLinks = item.sources
        .map(
          (source) =>
            `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a>`
        )
        .join('<br/>');

      return `
        <tr>
          <td>${escapeHtml(item.actor)}</td>
          <td>${escapeHtml(item.status)}</td>
          <td>${escapeHtml(item.motivation)}</td>
          <td>${escapeHtml(item.targets)}</td>
          <td>${sourceLinks}</td>
        </tr>
      `;
    })
    .join('');
};

const filterItems = (items, query) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }

  return items.filter((item) =>
    [item.actor, item.aliases.join(' '), item.targets, item.motivation]
      .join(' ')
      .toLowerCase()
      .includes(normalized)
  );
};

const init = async () => {
  const response = await fetch('data/threats.json', { cache: 'no-store' });
  const data = await response.json();
  let visibleItems = data;

  renderRows(visibleItems);

  searchInput.addEventListener('input', () => {
    visibleItems = filterItems(data, searchInput.value);
    renderRows(visibleItems);
  });
};

void init();
