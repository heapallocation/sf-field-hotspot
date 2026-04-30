# TODO

## sf-field-hotspot

- [ ] Flow filter — show only fields touched by a selected flow
- [ ] Record Creation view (Tab 2) — directed graph of what automation creates which objects, parsed from `<recordCreates>` elements
- [ ] Show trigger object next to flow names in sidebar — makes cross-object chains readable

## New project: sf-field-hotspot Salesforce App (unmanaged package)

Install directly into any Salesforce org — no local tooling needed.

### Architecture
- **Tooling API** — fetch flow definitions via `FlowDefinition` + `FlowVersion` queries, returns full flow XML
- **Parsing in LWC JS** — reuse existing parse logic client-side, no Apex XML parsing needed, more versatile
- **UI** — LWR React site or LWC app presenting the same bubble chart visualisation
- **Flow links** — bubbles link directly to Flow Builder (`/builder_platform_interaction/flowBuilder.app?flowId=...`)
- **Auth** — Named Credentials / Connected App for Tooling API access from LWC

### Learning goals
- Tooling API — querying flow metadata at runtime
- Unmanaged packages — what goes in them, deployment, difference from managed
- LWR React vs LWC — when each makes sense
- Named Credentials / Connected Apps — Tooling API auth pattern from LWC

### First step
Verify Tooling API returns enough flow definition detail to parse the same patterns as the local XML parser.

---

## New tool: sf-log-hotspot

Ingest Salesforce debug logs and build a runtime field dependency map.

### Views
- Same bubble chart as sf-field-hotspot but weighted by frequency — fields that change most often in real transactions
- Transaction view — which flows co-executed in the same save event, in what order
- Comparison mode — diff static (XML) vs actual (logs):
  - In XML but never in logs = dead automation
  - In logs but not in XML = something outside flows is writing this field (Apex, Process Builder, workflow rules)
  - In both = confirmed live automation

---

## New tool: Permission Set Similarity Analyser

Identify permission sets that could be merged in complex orgs.

### Why Tooling API not repo XML
- Repo XML only contains what was explicitly retrieved — standard object permissions missing unless in package.xml
- Tooling API queries live org data — `PermissionSet`, `ObjectPermissions`, `FieldPermissions`, `SetupEntityAccess` — full picture regardless of manifest
- Same org-connected app architecture as sf-field-hotspot Salesforce app

### Data model
Two shapes per permission set — computation and display:

**Computation** — flat Sets per category for fast Jaccard similarity:
```js
{
    system:  Set { 'ManageUsers', 'ViewSetup' },
    objects: Set { 'Case:Read', 'Case:Edit' },
    fields:  Set { 'Case:Status:Edit' },
    apex:    Set { 'CaseController' }
}
```

**Display** — structured for rendering and diff:
```js
{
    name: 'Attendance_School_Leadership',
    assignedUsers: 24,
    system:  [{ name: 'ManageUsers', label: 'Manage Users' }],
    objects: [{ object: 'Case', read: true, edit: true, create: false, delete: false }],
    fields:  [{ object: 'Case', field: 'Status', read: true, edit: true }],
    apex:    [{ class: 'CaseController' }]
}
```

Display shape is source of truth — Sets derived at computation time.

### Similarity
- **Jaccard per category**: `intersection.size / union.size` (0 = nothing in common, 1 = identical)
- **Pairwise** — every permission set compared against every other
- **Threshold filter** — only draw edges above a similarity threshold (UI slider) to keep graph readable
- **Merge diff** — for any two permission sets: `A - B` (would lose), `B - A` (would gain), `A ∩ B` (safe)

### Views

**1. Cluster view (overview)**
- Force-directed graph — nodes = permission sets, edge strength = similarity score
- Proximity = similarity, clusters = merge candidates
- Node size = assigned users — large node with small nearby node = clear merge candidate
- Category selector changes which similarity score drives clustering (overall / system / objects / fields / apex)
- Similarity threshold slider — controls which edges are drawn

**2. Matrix view (detail)**
- Triggered by selecting 2-5 nodes in cluster view + clicking Compare
- Filter by object → field-level matrix renders:
  ```
  Case fields       PermSetA  PermSetB  PermSetC
  Status:Read          ✓         ✓         ✓
  Status:Edit          ✓         ✓         ✗
  OwnerId:Edit         ✓         ✗         ✗
  ```
- Rows sorted by most divergent first — differences surface at the top
- Green = granted, empty = not granted
- Classic overview → detail pattern: cluster for discovery, matrix for analysis

### Log parsing
- `FLOW_START_INTERVIEW_BEGIN` — flow started
- `FLOW_ELEMENT_BEGIN` — element executed (recordUpdate, assignment etc.)
- `DML_BEGIN` / field change entries — actual field writes
