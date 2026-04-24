# TODO

## sf-field-hotspot

- [ ] Flow filter — show only fields touched by a selected flow
- [ ] Record Creation view (Tab 2) — directed graph of what automation creates which objects, parsed from `<recordCreates>` elements
- [ ] Show trigger object next to flow names in sidebar — makes cross-object chains readable

## New tool: sf-log-hotspot

Ingest Salesforce debug logs and build a runtime field dependency map.

### Views
- Same bubble chart as sf-field-hotspot but weighted by frequency — fields that change most often in real transactions
- Transaction view — which flows co-executed in the same save event, in what order
- Comparison mode — diff static (XML) vs actual (logs):
  - In XML but never in logs = dead automation
  - In logs but not in XML = something outside flows is writing this field (Apex, Process Builder, workflow rules)
  - In both = confirmed live automation

### Log parsing
- `FLOW_START_INTERVIEW_BEGIN` — flow started
- `FLOW_ELEMENT_BEGIN` — element executed (recordUpdate, assignment etc.)
- `DML_BEGIN` / field change entries — actual field writes
