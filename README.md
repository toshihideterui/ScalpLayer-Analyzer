# ScalpLayer Research Lab v6.2

Multi Symbol Foundation Edition

ScalpLayer Research Lab is a research-only dashboard for CSV files exported by ScalpLayer Integrated EA.
It does not edit the EA, rewrite CSV files, change trading conditions, run auto optimization, call AI APIs, or guarantee profit.

The purpose is to help continue the ScalpLayer Project research cycle:

Build -> Research -> Debug -> Validate -> Improve -> Optimize -> Repeat

---

## What v6.2 Adds

v6.2 adds the internal foundation for future multi-symbol research.
The current production workflow remains USDJPY-only, and existing USDJPY CSV files continue to work without any change.

Added:

- Optional `Symbol` column support
- Optional `CurrencyPair` column support
- Automatic `symbol = "USDJPY"` fallback for legacy CSV files
- `currentSymbol` in Analyzer Snapshot
- `availableSymbols` in Analyzer Snapshot
- Current Symbol display on the Dashboard
- Currency pair display in CSV Manager
- Internal helper functions:
  - `getCurrentSymbol()`
  - `getAvailableSymbols()`
  - `filterBySymbol(symbol)`
  - `groupBySymbol()`

The CSV schema version is not changed.
If a CSV does not contain `Symbol` or `CurrencyPair`, the Analyzer treats it as USDJPY internally.

Future expansion target examples:

- GBPJPY
- EURUSD
- AUDJPY
- XAUUSD

At this stage, the UI and research output are still intended for USDJPY operation.
Multi-symbol switching UI is not added yet.

---

## What v6.1 Adds

v6.1 does not add a new analysis engine.
It improves daily Research productivity.

Added:

- Research Dashboard layout improvements
- Important cards moved to the top
- Dashboard Customize
- Dashboard card ON/OFF
- Dashboard card display order control
- `localStorage` persistence for dashboard layout
- Favorite Engine
- Favorite Engine fixed display on Dashboard
- Research Snapshot Compare
- Previous snapshot comparison
- Previous-day snapshot comparison
- Last 7 snapshot average comparison
- Improvement / worsening color display
- Fast Search tab
- Full-text search across Research, Hypothesis, Knowledge Graph, TopNG, and Engine data
- Export All button
- Markdown / JSON / CSV summary batch export
- Research Productivity section in Markdown export
- Productivity settings in Analyzer Snapshot JSON
- Responsive layout improvements
- Dashboard rendering cleanup

No new trading logic, AI API, CSV rewriting, or EA changes were added.

---

## What v6.0 Adds

v6.0 adds `Research Strategy Engine`.

This engine answers:

```text
Which Research should be done next?
```

It does not decide trading priority.
It only ranks Research candidates.

Added:

- `researchStrategyEngine.js`
- Research Strategy tab
- Research Priority Matrix
- Research Cost
- Expected Research Value
- Research ROI
- Research Risk
- Dependency Analyzer
- Blocker Detection
- Quick Win Top10
- Long Project Top10
- Duplicate Research
- Missing Research
- Research Coverage
- Research HeatMap
- Research Roadmap
- Research Strategy Summary
- Dashboard integration
- AI Research Brain integration
- Markdown integration
- Analyzer Snapshot integration
- Research History summary fields

---

## What v5.3 Added

v5.3 extends the v5.2 Research Hypothesis system with:

- `hypothesisLineageEngine.js`
- Hypothesis Lineage tab
- Hypothesis relations
- Hypothesis family detection
- Evidence Weight Settings
- Weighted Evidence Score
- Hypothesis Score 2.0
- Confidence Percent
- Validation Readiness
- Validation Checklist
- Hypothesis Compare
- Duplicate Detection
- Superseded Warning
- Orphan Hypothesis list
- Hypothesis History
- Dashboard Lineage Summary
- AI Research Brain Lineage Summary
- Knowledge Graph hypothesis integration
- Markdown export integration
- Analyzer Snapshot integration

---

## Hypothesis Lineage

Hypothesis Lineage manages relationships between research hypotheses.

Supported relation types:

- Parent
- Child
- Supports
- Contradicts
- Derived From
- Duplicate
- Alternative
- Requires
- Supersedes

Relations are stored in browser `localStorage`.

Storage key:

```text
scalplayerHypothesisLineage
```

The relation editor is available in the `Hypothesis Lineage` tab.

---

## Evidence Weighting

Evidence sources are weighted so that stronger or more reliable sources can influence Hypothesis Score 2.0.

Default weights:

| Source | Weight |
|---|---:|
| Research Manager | 1.00 |
| Trade | 1.00 |
| NearMiss | 0.85 |
| Engine DNA | 0.80 |
| Cross CSV | 0.90 |
| Knowledge Graph | 0.70 |
| Timeline | 0.65 |
| Data Quality | 0.95 |
| Manual Evidence | 0.75 |
| Other | 0.50 |

Weights can be edited from `Evidence Weight Settings`.

Storage key:

```text
scalplayerEvidenceWeights
```

---

## Hypothesis Score 2.0

Hypothesis Score 2.0 is a research priority score from 0 to 100.

It uses:

- Weighted Evidence Score
- Data Quality
- Cross CSV Correlation
- Engine Stability
- Timeline Continuity
- Validation Completeness
- Contradiction Penalty
- Open Question Penalty
- Duplicate Penalty
- Superseded Penalty

This score is not a trading signal.
It is only a guide for choosing the next Research target.

---

## Confidence 2.0

Confidence 2.0 adds a numeric `Confidence Percent` to the existing confidence label.

Labels:

- High
- Medium
- Low
- Insufficient

It considers:

- Weighted Evidence
- Evidence Source Diversity
- Data Quality
- Trade Sample
- NearMiss Sample
- Timeline Snapshot Count
- Contradiction Count
- Open Question Count
- Duplicate Relation
- Superseded Relation

---

## Validation Readiness

Validation Readiness shows whether a hypothesis is ready to be tested.

Labels:

- Ready
- Almost Ready
- Needs Evidence
- Needs Definition
- Blocked

Checklist items:

- Hypothesis Defined
- Reason Defined
- Validation Plan Defined
- Success Criteria Defined
- Failure Criteria Defined
- Required Data Defined
- Evidence Collected
- Multiple Evidence Sources
- Data Quality Checked
- Contradictions Reviewed
- Open Questions Reviewed
- Decision Ready

---

## Hypothesis History

Hypothesis History records important research changes.

Storage key:

```text
scalplayerHypothesisHistory
```

Stored event examples:

- Status Change
- Relation Added
- Relation Removed
- Evidence Weighted
- Contradictions Reviewed
- Open Questions Reviewed

The latest 500 events are kept.

---

## Cloudflare Upload Files

When updating Workers & Pages, upload these files together:

- `index.html`
- `style.css`
- `script.js`
- `analysisEngine.js`
- `performanceUtil.js`
- `dataQualityEngine.js`
- `crossCsvEngine.js`
- `trendEngine.js`
- `engineDnaEngine.js`
- `knowledgeGraphEngine.js`
- `researchWorkspaceEngine.js`
- `researchHypothesisEngine.js`
- `hypothesisLineageEngine.js`
- `researchStrategyEngine.js`
- `researchTemplates.js`
- `researchStorage.js`
- `researchManager.js`
- `recommendationEngine.js`
- `knowledgeEngine.js`
- `brainEngine.js`

Do not upload MT5 EA files to this Analyzer site.

---

## Safety Boundary

ScalpLayer Research Lab v5.3 does not:

- Change EA code
- Change CSV files
- Rewrite CSV data
- Change trading conditions
- Perform auto optimization
- Perform auto trading
- Call AI APIs
- Generate fake data
- Generate fake evidence
- Guarantee profit

This is a research support tool only.
