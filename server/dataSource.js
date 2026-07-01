/**
 * Data-source abstraction.
 *
 * Every data source must return data in the SAME normalized shape so the
 * rest of the application (API routes + frontend) never needs to change when
 * the underlying storage is swapped.
 *
 * Today the only implementation is the CSV source (mock data). When the threat
 * intelligence moves to BigQuery, add a `BigQueryDataSource` that implements the
 * same methods and select it via the DATA_SOURCE environment variable. No other
 * code should need to change.
 *
 * Normalized actor shape:
 * {
 *   id: string,                     // main_threat_actor_id
 *   country: string,                // origin country
 *   classification: string,
 *   activeSince: string,
 *   lastObserved: string,
 *   status: string,
 *   targetedCountries: string[],
 *   targetedIndustries: string[],
 *   ttps: [{ id: string, name: string }],
 *   aliases: [{ id: string, name: string }]
 * }
 */

import { CsvDataSource } from './csvDataSource.js';

/**
 * Base contract every data source implements. Methods return Promises so that
 * async backends (BigQuery) drop in without changing callers.
 */
export class DataSource {
  /** @returns {Promise<Array>} every actor in normalized shape */
  async getActors() {
    throw new Error('getActors() not implemented');
  }

  /** @returns {Promise<object|null>} a single actor by id (case-insensitive) */
  async getActor(_id) {
    throw new Error('getActor() not implemented');
  }

  /** @returns {Promise<Array<{country: string, count: number}>>} origin countries that have at least one actor */
  async getOriginCountries() {
    throw new Error('getOriginCountries() not implemented');
  }

  /** @returns {Promise<Array>} actors whose origin country matches (case-insensitive) */
  async getActorsByCountry(_country) {
    throw new Error('getActorsByCountry() not implemented');
  }

  /** @returns {Promise<Array>} actors matching a free-text query over name + aliases */
  async search(_query) {
    throw new Error('search() not implemented');
  }

  /** @returns {Promise<object>} aggregate dashboard stats */
  async getStats() {
    throw new Error('getStats() not implemented');
  }
}

/**
 * Returns the configured data source. Selected with the DATA_SOURCE env var.
 * Defaults to the CSV mock source.
 */
export function createDataSource() {
  const kind = (process.env.DATA_SOURCE || 'csv').toLowerCase();

  switch (kind) {
    case 'csv':
      return new CsvDataSource();
    case 'bigquery':
      // Future: return new BigQueryDataSource();
      throw new Error(
        'BigQuery data source is not implemented yet. Implement BigQueryDataSource ' +
          'with the same methods as CsvDataSource and wire it up here.'
      );
    default:
      throw new Error(`Unknown DATA_SOURCE "${kind}". Use "csv" or "bigquery".`);
  }
}
