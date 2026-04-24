# SF Field Hotspot

A field dependency analyser for Salesforce orgs. Point it at a repo and it generates a visual heatmap showing which fields are touched by automation — and where the risks are.

## Usage

```bash
node index.js /path/to/salesforce-repo
```

Opens `hotspot-report.html` in your browser.

## What it does

Parses all flow XML files in the repo and maps every field reference — what writes to it, what conditions on it, and from which element type. Renders a bubble chart where bubble size reflects how many flows touch a field, and colour reflects risk level.

## Why it's useful

**Figure out how and when fields are set** — instead of opening flows one by one, see every flow that writes a field in one click.

**Identify flows you didn't know were setting fields** — surfaces potential tech debt where automation is quietly writing to fields in ways that weren't obvious.

**Hotspot for process** — clicking a field like `Status` shows every flow using it for assignment or conditions. Useful for understanding how a process actually works end to end.

**Identify regression risk** — before changing how a field works, see exactly which automation depends on it. The critical (red) bubbles are where a change is most likely to break something.

## Risk levels

| Colour | Meaning |
|--------|---------|
| Red — Critical | A flow writes this field via `recordUpdate` (DML), and another flow conditions on it at `start`. The write triggers a new save event, re-firing all triggered flows. |
| Orange — High | A before-save flow writes this field via assignment, and another flow conditions on it at `start`. Same transaction, but can cause unexpected firing. |
| Yellow — Medium | Field is written and read in decision nodes — behavioral impact rather than trigger risk. |
| Dark red — Write only | Written by automation but nothing conditions on it. |
| Blue — Read only | Conditioned on by automation but nothing here writes it. |

## Element types

| Badge | Meaning |
|-------|---------|
| `start` | Field appears in the flow's entry condition |
| `decision` | Field appears in a decision node inside the flow |
| `recordUpdate` | Field is written via DML |
| `assignment` | Field is written via before-save assignment to `$Record` |
| `screen` | Field is written by a screen flow |

## Filters

- **Risk** — filter bubbles by risk level
- **Element** — filter by where the field is referenced
- **Object** — focus on a single object
- **Field search** — find a specific field by name
