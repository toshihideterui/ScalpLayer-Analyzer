# Research Strategy Engine Specification v6.0

## Purpose

Research Strategy Engine answers:

```text
Which Research should be done next?
```

It is a research support engine.
It is not a trading engine and does not generate trading signals.

---

## Safety Boundary

Forbidden:

- EA code changes
- CSV changes
- CSV rewriting
- Trading-condition changes
- Auto optimization
- Auto trading
- AI API calls
- Fake data generation
- Fake evidence generation
- Profit guarantee
- Trading signal generation

---

## Version

```text
ScalpLayer Research Lab v6.0
Research Strategy Engine Edition
CSV_SCHEMA_VERSION = 4.0.1
```

No new CSV file is added.

---

## Public API

File:

```text
researchStrategyEngine.js
```

Public method:

```text
snapshot()
```

---

## Input Sources

The Strategy Engine reads existing Analyzer data:

- Research Manager
- Research Workspace
- Research Hypothesis
- Hypothesis Lineage
- Knowledge Graph
- Engine DNA
- Cross CSV
- Timeline
- Research History
- Performance
- Data Quality
- Analyzer Snapshot

---

## Priority Matrix

Research candidates are classified into:

- Critical
- High
- Medium
- Low
- Deferred

This is Research priority, not trading priority.

---

## Research Cost

Research Cost labels:

- Very Small
- Small
- Medium
- Large
- Very Large

Cost is based on validation readiness, blockers, and missing data.

---

## Expected Research Value

Expected Research Value labels:

- Very High
- High
- Medium
- Low
- Very Low

This is research value, not profit value.

---

## Research ROI

Research ROI is calculated from:

```text
Research Value / Research Cost
```

Displayed as:

```text
1/5 to 5/5
```

---

## Research Risk

Research Risk labels:

- Low
- Medium
- High

This is Research Risk, not trade risk.

---

## Blocker Detection

Blockers include:

- Evidence insufficient
- Trade insufficient
- NearMiss insufficient
- Session insufficient
- Knowledge Graph insufficient
- Cross CSV insufficient
- Timeline insufficient
- Validation insufficient

---

## Research Coverage

Coverage areas:

- Engine
- Session
- Condition
- TopNG
- Knowledge Graph
- Research Manager
- Workspace
- Hypothesis
- Cross CSV
- Timeline

Coverage is shown as a percentage.

---

## Research Roadmap

Roadmap creates up to 10 ordered Research steps.

It uses:

- Highest ROI
- Current blockers
- Missing Research areas
- Validation readiness

It does not change EA code or trading conditions.

---

## Snapshot Fields

Analyzer Snapshot adds:

- `researchStrategy`
- `priorityMatrix`
- `researchROI`
- `coverage`
- `roadmap`
- `quickWin`
- `longProject`
- `duplicateResearch`
- `missingResearch`
- `blockers`
- `strategySummary`

Research History Snapshot adds:

- `averageResearchROI`
- `coveragePercent`
- `highestImpactResearch`
- `highestPriorityResearch`
- `blockerCount`
- `roadmapProgress`

---

## UI

New tab:

```text
Research Strategy
```

Main panels:

- Priority Matrix
- ROI Table
- Coverage Card
- Roadmap Card
- Quick Win Card
- Long Project Card
- Blocker Card
- Dependency Graph
- Research HeatMap

---

## Cloudflare Upload

Add this file to the existing upload set:

```text
researchStrategyEngine.js
```

All existing Analyzer files remain required.
