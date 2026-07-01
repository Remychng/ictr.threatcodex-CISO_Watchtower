import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// File locations are configurable so the mock data can live anywhere.
const INTELLIGENCE_CSV =
  process.env.INTELLIGENCE_CSV || path.join(ROOT, 'mock data', 'Threat Intelligence.csv');
const ALIAS_CSV = process.env.ALIAS_CSV || path.join(ROOT, 'mock data', 'Threat alias.csv');

/** Splits a "; " separated cell into a trimmed, non-empty array. */
function splitList(value) {
  if (!value) return [];
  return value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Parses a "T1566 - Phishing" TTP string into { id, name }. */
function parseTtp(raw) {
  const idx = raw.indexOf(' - ');
  if (idx === -1) return { id: '', name: raw.trim() };
  return {
    id: raw.slice(0, idx).trim(),
    name: raw.slice(idx + 3).trim(),
  };
}

/**
 * CSV-backed implementation of the DataSource contract. Reads both mock files,
 * joins aliases onto their actor, and normalizes every record.
 *
 * Reads are cheap for mock data; the parsed result is cached and reloaded only
 * when a file's modification time changes, so edits to the CSVs are picked up
 * without restarting the server.
 */
export class CsvDataSource {
  constructor() {
    this._cache = null;
    this._mtimes = { intelligence: 0, alias: 0 };
  }

  _filesChanged() {
    try {
      const i = fs.statSync(INTELLIGENCE_CSV).mtimeMs;
      const a = fs.statSync(ALIAS_CSV).mtimeMs;
      return i !== this._mtimes.intelligence || a !== this._mtimes.alias;
    } catch {
      return true;
    }
  }

  _load() {
    if (this._cache && !this._filesChanged()) {
      return this._cache;
    }

    const intelligenceRaw = fs.readFileSync(INTELLIGENCE_CSV, 'utf8');
    const aliasRaw = fs.readFileSync(ALIAS_CSV, 'utf8');

    this._mtimes = {
      intelligence: fs.statSync(INTELLIGENCE_CSV).mtimeMs,
      alias: fs.statSync(ALIAS_CSV).mtimeMs,
    };

    const intelligenceRows = parse(intelligenceRaw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    const aliasRows = parse(aliasRaw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    // Group aliases by their parent actor id.
    const aliasesByActor = new Map();
    for (const row of aliasRows) {
      const actorId = row.main_threat_actor_id;
      if (!actorId) continue;
      if (!aliasesByActor.has(actorId)) aliasesByActor.set(actorId, []);
      aliasesByActor.get(actorId).push({
        id: row.alias_id,
        name: row.alias_name,
      });
    }

    const actors = intelligenceRows.map((row) => ({
      id: row.main_threat_actor_id,
      country: row.country,
      classification: row.classification,
      activeSince: row.active_since,
      lastObserved: row.last_observed,
      status: row.status,
      targetedCountries: splitList(row.targeted_countries_regions),
      targetedIndustries: splitList(row.targeted_industries),
      ttps: splitList(row.attck_ttps).map(parseTtp),
      aliases: aliasesByActor.get(row.main_threat_actor_id) || [],
    }));

    this._cache = actors;
    return actors;
  }

  async getActors() {
    return this._load();
  }

  async getActor(id) {
    if (!id) return null;
    const target = id.toLowerCase();
    return this._load().find((a) => a.id.toLowerCase() === target) || null;
  }

  async getOriginCountries() {
    const counts = new Map();
    for (const actor of this._load()) {
      const country = actor.country?.trim();
      if (!country) continue;
      counts.set(country, (counts.get(country) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
  }

  async getActorsByCountry(country) {
    if (!country) return [];
    const target = country.toLowerCase();
    return this._load().filter((a) => a.country?.toLowerCase() === target);
  }

  async search(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    return this._load().filter((actor) => {
      if (actor.id.toLowerCase().includes(q)) return true;
      return actor.aliases.some((alias) => alias.name.toLowerCase().includes(q));
    });
  }

  async getStats() {
    const actors = this._load();
    const countries = new Set();
    const classifications = new Map();
    const targetedCountries = new Set();

    for (const actor of actors) {
      if (actor.country) countries.add(actor.country);
      if (actor.classification) {
        classifications.set(
          actor.classification,
          (classifications.get(actor.classification) || 0) + 1
        );
      }
      for (const t of actor.targetedCountries) targetedCountries.add(t);
    }

    return {
      totalActors: actors.length,
      originCountries: countries.size,
      targetedRegions: targetedCountries.size,
      classifications: [...classifications.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    };
  }
}
