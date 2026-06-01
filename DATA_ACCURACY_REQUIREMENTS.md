# Data Accuracy Requirements

## Purpose

This dashboard is a decision-support view. Any static list in this repository is reference-only and cannot be treated as the final source of truth.

## Mandatory data sources

The production data pipeline must ingest and reconcile threat actor intelligence from all of the following:

1. Malpedia actor profile for Crimson Collective:
   https://malpedia.caad.fkie.fraunhofer.de/actor/crimson_collective
2. The Threat Codex:
   https://threatcodex.com/
3. YETI (Your Everyday Threat Intelligence):
   https://yeti-platform.io/

## Mandatory implementation rules

1. YETI must be implemented and used as a core enrichment and confidence layer.
2. Hourly scans are required to detect new activity, status changes, TTP updates, and source drift.
3. Every hourly run must:
   - Pull fresh records from all three mandatory sources.
   - Normalize actor names and aliases.
   - Reconcile conflicts using source-priority and confidence rules.
   - Update output data consumed by the dashboard.
   - Record timestamp, source versions, and reconciliation decisions.
4. If sources conflict, mark records for analyst review rather than silently overwriting data.

## Suggested operational flow

1. Scheduler triggers an hourly collection job.
2. Collectors query Malpedia, Threat Codex, and YETI.
3. Normalization service maps actor IDs and aliases.
4. Reconciliation service calculates final fields and confidence.
5. Export curated JSON for dashboard consumption.
6. Persist job logs and change summaries for auditability.

## Demonstration vs production

- `demo-local.html` is intended for offline demonstration only.
- Production deployment must use the hourly source-driven pipeline above.
