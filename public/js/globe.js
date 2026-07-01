/**
 * Rotating globe built on Globe.gl.
 *
 * Data-driven: it is handed the set of origin countries (with actor counts) and
 * — when an actor is selected — the list of that actor's targeted regions. It
 * resolves country/region names to the globe's polygons and colours them.
 *
 *  - Origin countries are shaded blue by actor count (light = few, dark = many).
 *  - Targeted countries glow amber while an actor is selected.
 *
 * The only curated, non-data part here is the presentation mapping that expands
 * regional phrases ("SE Asia", "Middle East", …) into individual countries.
 * Real country names are matched directly against the globe's own polygon names,
 * so any new origin or target country in the data lights up automatically.
 */

// Globe surface + polygon colours. No external texture — a clean political map.
const ATMOSPHERE = 'rgb(120, 140, 230)';
const TARGET_COLOR = 'rgb(240, 142, 28)';
const TARGET_HOVER = 'rgb(255, 170, 60)';
const OCEAN_COLOR = '#ffffff';
const INACTIVE_CAP = '#d8dbe7'; // land fill — clearly distinct from the ocean
const INACTIVE_SIDE = '#9aa6c9';
const BORDER_COLOR = 'rgb(31, 43, 207)'; // white country borders
const HOVER_COLOR = 'rgb(61, 63, 240)';
const POLY_ALTITUDE = 0.01; // constant — never changed on hover (performance)

// Blue shade scale endpoints (light → dark) used for origin countries.
const SHADE_LIGHT = [150, 172, 235];
const SHADE_DARK = [1, 2, 143];

// Country-name aliases between the dataset and the world-atlas GeoJSON.
const NAME_ALIASES = {
  russianfederation: 'russia',
  unitedstatesofamerica: 'unitedstates',
  unitedstates: 'unitedstates',
  usa: 'unitedstates',
  us: 'unitedstates',
  republicofkorea: 'southkorea',
  democraticpeoplesrepublicofkorea: 'northkorea',
  koreademrep: 'northkorea',
  czechrepublic: 'czechia',
};

function normalizeCountry(name) {
  const key = (name || '').toLowerCase().replace(/[^a-z]/g, '');
  return NAME_ALIASES[key] || key;
}

function lerpColor(a, b, t) {
  const ch = (i) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
}

// ---- Regional groupings (presentation-only, extend as needed) -------------
const R = {
  EASTERN_EUROPE: ['Ukraine', 'Poland', 'Romania', 'Hungary', 'Slovakia', 'Czechia', 'Bulgaria', 'Belarus', 'Moldova', 'Serbia', 'Croatia', 'Slovenia', 'Lithuania', 'Latvia', 'Estonia'],
  WESTERN_EUROPE: ['France', 'Germany', 'United Kingdom', 'Netherlands', 'Belgium', 'Spain', 'Italy', 'Switzerland', 'Austria', 'Portugal', 'Ireland', 'Luxembourg'],
  EUROPE: ['France', 'Germany', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Poland', 'Ukraine', 'Romania', 'Hungary', 'Slovakia', 'Czechia', 'Austria', 'Switzerland', 'Sweden', 'Norway', 'Finland', 'Denmark', 'Ireland', 'United Kingdom', 'Portugal', 'Greece', 'Bulgaria', 'Croatia', 'Serbia', 'Slovenia', 'Lithuania', 'Latvia', 'Estonia', 'Belarus', 'Moldova'],
  EU: ['France', 'Germany', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Poland', 'Romania', 'Hungary', 'Slovakia', 'Czechia', 'Austria', 'Sweden', 'Finland', 'Denmark', 'Ireland', 'Portugal', 'Greece', 'Bulgaria', 'Croatia', 'Slovenia', 'Lithuania', 'Latvia', 'Estonia'],
  NATO: ['United States of America', 'Canada', 'United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Poland', 'Romania', 'Hungary', 'Slovakia', 'Czechia', 'Norway', 'Denmark', 'Portugal', 'Greece', 'Turkey', 'Albania', 'Croatia', 'Slovenia', 'Lithuania', 'Latvia', 'Estonia', 'Bulgaria'],
  MIDDLE_EAST: ['Saudi Arabia', 'Iraq', 'Iran', 'Israel', 'Jordan', 'Syria', 'Lebanon', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Oman', 'Yemen', 'Turkey'],
  GULF: ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Oman', 'Bahrain'],
  SE_ASIA: ['Vietnam', 'Thailand', 'Malaysia', 'Indonesia', 'Philippines', 'Cambodia', 'Laos', 'Myanmar', 'Singapore', 'Brunei'],
  EAST_ASIA: ['China', 'Japan', 'South Korea', 'North Korea', 'Taiwan', 'Mongolia'],
  SOUTH_ASIA: ['India', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Bhutan'],
  NORTH_AMERICA: ['United States of America', 'Canada', 'Mexico'],
  SOUTH_AMERICA: ['Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Venezuela', 'Bolivia', 'Ecuador', 'Paraguay', 'Uruguay'],
  AFRICA: ['Egypt', 'Nigeria', 'South Africa', 'Kenya', 'Ethiopia', 'Madagascar', 'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Sudan', 'Tanzania', 'Uganda', 'Ghana'],
  FORMER_SOVIET: ['Russia', 'Ukraine', 'Belarus', 'Kazakhstan', 'Georgia', 'Armenia', 'Azerbaijan', 'Moldova', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan', 'Lithuania', 'Latvia', 'Estonia'],
};
R.ASIA = [...new Set([...R.EAST_ASIA, ...R.SE_ASIA, ...R.SOUTH_ASIA, 'Kazakhstan', 'Uzbekistan'])];
R.ASIA_PACIFIC = [...new Set([...R.EAST_ASIA, ...R.SE_ASIA, 'Australia', 'New Zealand'])];

// Phrases matched against target text, longest first so specific wins.
const PHRASE_ENTRIES = [
  ['former soviet', R.FORMER_SOVIET],
  ['eastern europe', R.EASTERN_EUROPE],
  ['western europe', R.WESTERN_EUROPE],
  ['asia-pacific', R.ASIA_PACIFIC],
  ['asia pacific', R.ASIA_PACIFIC],
  ['southeast asia', R.SE_ASIA],
  ['south asia', R.SOUTH_ASIA],
  ['east asia', R.EAST_ASIA],
  ['se asia', R.SE_ASIA],
  ['middle east', R.MIDDLE_EAST],
  ['north america', R.NORTH_AMERICA],
  ['latin america', R.SOUTH_AMERICA],
  ['south america', R.SOUTH_AMERICA],
  ['gulf', R.GULF],
  ['africa', R.AFRICA],
  ['european', R.EUROPE],
  ['europe', R.EUROPE],
  ['asia', R.ASIA],
].sort((a, b) => b[0].length - a[0].length);

// Short codes matched on word boundaries before phrase scanning.
const CODE_ENTRIES = [
  [/\bunited states\b|\bu\.?s\.?a\.?\b|\bus\b/, ['United States of America']],
  [/\bunited kingdom\b|\buk\b/, ['United Kingdom']],
  [/\bnato\b/, R.NATO],
  [/\beuropean union\b|\beu\b/, R.EU],
  [/\buae\b/, ['United Arab Emirates']],
];

class ThreatGlobe {
  constructor(element, { onCountryClick } = {}) {
    this.onCountryClick = onCountryClick || (() => {});
    this.activeByName = new Map(); // normalized name -> { country, count }
    this.targetSet = new Set(); // normalized names targeted by selected actor
    this.maxCount = 1;
    this.hovered = null;
    this.geoNames = []; // { raw, norm } for every polygon

    this.world = Globe({ rendererConfig: { antialias: true, logarithmicDepthBuffer: true } })(element)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor(ATMOSPHERE)
      .atmosphereAltitude(0.16)
      .showGraticules(true)
      .polygonsTransitionDuration(0); // no animated re-tessellation on update

    const material = this.world.globeMaterial();
    material.color.set(OCEAN_COLOR);
    material.emissive.set('#c8cfe8');
    material.emissiveIntensity = 0.1;
    material.shininess = 3;

    // Cap the device pixel ratio: rendering at full retina DPR is the single
    // biggest cause of globe lag on high-density displays.
    this.world.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    const controls = this.world.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.enablePan = false;
    controls.minDistance = 200;
    controls.maxDistance = 500;

    this.world.pointOfView({ lat: 22, lng: 80, altitude: 2.3 }, 0);

    // Stop the globe completely whenever the cursor is anywhere over it (not
    // just over an interactive country), and resume when the cursor leaves.
    const canvas = this.world.renderer().domElement;
    canvas.addEventListener('pointerenter', () => { controls.autoRotate = false; });
    canvas.addEventListener('pointerleave', () => {
      this.hovered = null;
      controls.autoRotate = true;
      canvas.style.cursor = 'grab';
      this._refreshColors();
    });

    this._handleResize = this._handleResize.bind(this);
    window.addEventListener('resize', this._handleResize);
    this._handleResize();
  }

  _handleResize() {
    const el = this.world.renderer().domElement.parentElement;
    if (!el) return;
    this.world.width(el.clientWidth).height(el.clientHeight);
  }

  _name(feature) {
    return feature?.properties?.name || '';
  }

  // Normalized name, computed once per feature and cached. Avoids re-running
  // the regex for all ~177 polygons on every hover refresh.
  _norm(feature) {
    if (feature.__norm === undefined) feature.__norm = normalizeCountry(this._name(feature));
    return feature.__norm;
  }

  _shadeFor(count) {
    const t = 0.2 + 0.8 * (count / this.maxCount); // keep the lightest readable
    return lerpColor(SHADE_LIGHT, SHADE_DARK, Math.min(1, t));
  }

  _capColor(feature) {
    const norm = this._norm(feature);
    if (this.targetSet.has(norm)) {
      return feature === this.hovered ? TARGET_HOVER : TARGET_COLOR;
    }
    const info = this.activeByName.get(norm);
    if (info) {
      if (feature === this.hovered) return HOVER_COLOR;
      return this._shadeFor(info.count);
    }
    return INACTIVE_CAP;
  }

  _sideColor(feature) {
    const norm = this._norm(feature);
    if (this.targetSet.has(norm)) return 'rgba(200, 110, 10, 0.5)';
    if (this.activeByName.has(norm)) return 'rgba(1, 2, 143, 0.32)';
    return INACTIVE_SIDE;
  }

  _isInteractive(feature) {
    const norm = this._norm(feature);
    return this.activeByName.has(norm) || this.targetSet.has(norm);
  }

  // Colour-only update — cheap, used on hover and when sets change. Altitude is
  // a constant so the polygon geometry is built once and never re-extruded.
  _refreshColors() {
    this.world
      .polygonCapColor((d) => this._capColor(d))
      .polygonSideColor((d) => this._sideColor(d));
  }

  // Full polygon setup, run once after the polygons load.
  _applyBase() {
    this.world
      .polygonAltitude(() => POLY_ALTITUDE)
      .polygonStrokeColor(() => BORDER_COLOR);
    this._refreshColors();
  }

  async load() {
    const res = await fetch('https://unpkg.com/world-atlas@2/countries-110m.json');
    const topo = await res.json();
    const features = topojson.feature(topo, topo.objects.countries).features;

    this.geoNames = features.map((f) => {
      const raw = this._name(f).toLowerCase();
      const norm = normalizeCountry(raw);
      f.__norm = norm; // cache for the hover-path color functions
      return { raw, norm };
    });

    this.world
      .polygonsData(features)
      .polygonsTransitionDuration(220)
      .polygonLabel((d) => {
        const norm = this._norm(d);
        if (this.targetSet.has(norm)) {
          return `<div style="font-family:Inter,sans-serif;background:${TARGET_COLOR};color:#fff;
            padding:7px 11px;border-radius:8px;font-size:12px">
            <strong>${this._name(d)}</strong><br/>targeted by selected actor</div>`;
        }
        const info = this.activeByName.get(norm);
        if (!info) return '';
        const noun = info.count === 1 ? 'threat actor' : 'threat actors';
        return `<div style="font-family:Inter,sans-serif;background:rgb(1,2,143);color:#fff;
          padding:7px 11px;border-radius:8px;font-size:12px;box-shadow:0 6px 18px rgba(1,2,143,.35)">
          <strong>${info.country}</strong><br/>${info.count} ${noun} · click to view</div>`;
      })
      .onPolygonHover((hover) => {
        const interactive = hover && this._isInteractive(hover);
        const next = interactive ? hover : null;
        if (next === this.hovered) return; // hovered country unchanged — no work
        const wasInteractive = this.hovered !== null;
        this.hovered = next;
        this.world.renderer().domElement.style.cursor = interactive ? 'pointer' : 'grab';
        // Only recolor when a highlighted country entered or left the hover.
        if (interactive || wasInteractive) this._refreshColors();
      })
      .onPolygonClick((feature) => {
        const info = this.activeByName.get(this._norm(feature));
        if (info) this.onCountryClick(info.country);
      });

    this._applyBase();
  }

  /** @param {Array<{country: string, count: number}>} countries */
  setActiveCountries(countries) {
    this.activeByName = new Map(countries.map((c) => [normalizeCountry(c.country), c]));
    this.maxCount = Math.max(1, ...countries.map((c) => c.count));
    this._refreshColors();
  }

  /**
   * Highlight the regions/countries a selected actor targets.
   * @param {string[]} targets raw values from the actor's targeted list
   */
  setTargets(targets) {
    this.targetSet = this._resolveTargets(targets || []);
    this._refreshColors();
  }

  clearTargets() {
    this.targetSet = new Set();
    this._refreshColors();
  }

  /** Resolve raw target strings into a Set of normalized polygon names. */
  _resolveTargets(targets) {
    const out = new Set();
    for (const token of targets) {
      let text = ' ' + token.toLowerCase() + ' ';

      // 1) Short country codes (word-boundary), then strip them out.
      for (const [re, list] of CODE_ENTRIES) {
        if (re.test(text)) {
          list.forEach((n) => out.add(normalizeCountry(n)));
          text = text.replace(re, ' ');
        }
      }

      // 2) Regional phrases, longest first; consume matches so generic
      //    phrases (e.g. "asia") don't double-match a specific one.
      for (const [phrase, list] of PHRASE_ENTRIES) {
        if (text.includes(phrase)) {
          list.forEach((n) => out.add(normalizeCountry(n)));
          text = text.split(phrase).join(' ');
        }
      }

      // 3) Direct country names taken from the globe's own polygons.
      for (const { raw, norm } of this.geoNames) {
        if (raw.length >= 4 && text.includes(raw)) out.add(norm);
      }
    }
    // Only keep names that correspond to a real polygon.
    const valid = new Set(this.geoNames.map((g) => g.norm));
    return new Set([...out].filter((n) => valid.has(n)));
  }
}

window.ThreatGlobe = ThreatGlobe;
