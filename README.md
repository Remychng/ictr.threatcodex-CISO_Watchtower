# ICTR ThreatCodex CISO Watchtower

Minimal, SharePoint-friendly static website for tracking active threat groups relevant to Deutsche Börse ICTR.

## Local demo file

For a download-and-open demonstration file (no web server required), use:

- `/demo-local.html`

Open it directly in your browser.

## Run locally (no Docker required)

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in Microsoft Edge.

## Data accuracy and source-of-truth requirements

- Current dashboard records are reference data and may contain outdated or partially incorrect information.
- Authoritative source data must be pulled from:
  - [Crimson Collective (Threat Actor)](https://malpedia.caad.fkie.fraunhofer.de/actor/crimson_collective)
  - [The Threat Codex](https://threatcodex.com/)
  - [YETI: Your Everyday Threat Intelligence](https://yeti-platform.io/)
- YETI implementation is mandatory for enrichment and confidence scoring.
- Hourly scans are required to track latest threat actor activity and refresh output data.
- See DATA_ACCURACY_REQUIREMENTS.md for operational details.

## Data updates

- Threat entries are stored in `/data/threats.json`.
- Start with sources such as:
  - https://malpedia.caad.fkie.fraunhofer.de/actor/crimson_collective
  - https://threatcodex.com/
- YETI is required for enrichment. Run it in a GitHub Codespace/VM and export curated hourly-curated results into this JSON file.
