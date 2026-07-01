# ThreatCodex

Interactive threat-actor intelligence dashboard. A rotating 3D globe highlights
the countries that threat actors originate from; hovering pauses the globe and
clicking a country lists its actors. A search bar finds actors by name or alias
and shows full intelligence on each one.

All actor data is served from a swappable data layer — nothing is hard-coded in
the frontend. The mock data lives in the two CSV files today and can be switched
to BigQuery later without touching the API routes or UI.

## Run

```bash
npm install
npm start
```

Then open http://localhost:3000

Use `npm run dev` for auto-reload while developing.

## Project structure

```
server/
  server.js          Express app + REST API
  dataSource.js      Data-source contract + factory (selects CSV/BigQuery)
  csvDataSource.js   CSV implementation (reads the two mock CSV files)
public/
  index.html         App shell
  css/styles.css     Soft-white theme, accent rgb(1,2,143)
  js/api.js          REST client
  js/globe.js        Globe.gl rotating globe + interactions
  js/app.js          Dashboard, search, country & actor detail views
mock data/
  Threat Intelligence.csv   Mock actor data
  Threat alias.csv          Mock alias data
logos and references/       Design references and source logos
```

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/stats` | Aggregate dashboard stats |
| `GET /api/actors` | All actors |
| `GET /api/actors/:id` | One actor (with aliases) |
| `GET /api/countries` | Origin countries with actor counts |
| `GET /api/countries/:country/actors` | Actors from a country |
| `GET /api/search?q=` | Search by actor name or alias |

## Data source

The active source is selected with the `DATA_SOURCE` environment variable
(`csv` by default). CSV file locations can be overridden with `INTELLIGENCE_CSV`
and `ALIAS_CSV`.

### Switching to BigQuery (future)

1. Create `server/bigQueryDataSource.js` implementing the same methods as
   `CsvDataSource` (see the contract in `server/dataSource.js`).
2. Wire it into the `createDataSource()` factory under the `bigquery` case.
3. Run with `DATA_SOURCE=bigquery`.

Because every source returns the same normalized shape, no API or frontend code
needs to change. Admin create/edit flows would write to BigQuery behind the same
data layer.

## Notes

The globe loads country polygons from the `world-atlas` dataset and Globe.gl via
CDN, so an internet connection is required the first time the page loads.

