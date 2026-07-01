/**
 * Thin client over the backend REST API. All data the UI renders comes through
 * here — nothing about the threat actors is hard-coded in the frontend.
 */
const api = {
  async _get(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed: ${url} (${res.status})`);
    return res.json();
  },

  stats() {
    return this._get('/api/stats');
  },

  countries() {
    return this._get('/api/countries');
  },

  actorsByCountry(country) {
    return this._get(`/api/countries/${encodeURIComponent(country)}/actors`);
  },

  actor(id) {
    return this._get(`/api/actors/${encodeURIComponent(id)}`);
  },

  search(query) {
    return this._get(`/api/search?q=${encodeURIComponent(query)}`);
  },
};
