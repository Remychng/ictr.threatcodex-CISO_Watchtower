# ICTR ThreatCodex CISO Watchtower

Minimal, SharePoint-friendly static website for tracking active threat groups relevant to Deutsche Börse ICTR.

## Run locally (no Docker required)

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in Microsoft Edge.

## Data updates

- Threat entries are stored in `/data/threats.json`.
- Start with sources such as:
  - https://malpedia.caad.fkie.fraunhofer.de/actor/crimson_collective
  - https://threatcodex.com/
- If YETI is required for enrichment, run it in a GitHub Codespace/VM and export curated results into this JSON file.
