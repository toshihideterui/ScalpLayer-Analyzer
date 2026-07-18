# Research Hypothesis Specification v5.3

## v5.3 Extension

Research Hypothesis is extended by `hypothesisLineageEngine.js`.

Added fields shown in the Research Hypothesis screen:

- Weighted Evidence Score
- Confidence Percent
- Hypothesis Score 2.0
- Score Breakdown
- Validation Readiness
- Validation Checklist
- Family
- Parent
- Children
- Supports
- Contradicts
- History Count
- Possible Duplicate Warning
- Superseded Warning

The original v5.2 hypothesis list, status, evidence, contradiction, open questions, and research flow are retained.

See:

```text
HYPOTHESIS_LINEAGE_SPECIFICATION.md
```

---

## Purpose

Research Hypothesis introduces a formal research layer to ScalpLayer Research Lab.

It helps organize:

- Hypothesis
- Evidence
- Validation
- Decision
- Archive

This feature is research-only. It does not change EA files, CSV files, or trading conditions.

---

## Hypothesis Status

Supported statuses:

- Draft
- Collecting Evidence
- Testing
- Verified
- Rejected
- Archived

Status is stored in browser `localStorage`.

Storage key:

```text
scalplayerResearchHypothesis
```

---

## Hypothesis List

Each hypothesis displays:

- Hypothesis
- Reason
- Evidence
- Confidence
- Status
- Hypothesis Score
- Contradiction
- Open Questions

---

## Evidence Sources

Evidence is automatically collected from existing Analyzer data:

| Source | Evidence Example |
|---|---|
| Research Manager | existing research item, decision, manual evidence |
| NearMiss | TopNG, NearMiss by Engine |
| Trade | trade count, win rate, profit factor |
| Engine DNA | stability, confidence, personality |
| Knowledge Graph | top connected engine, TopNG hub |
| Cross CSV | cross-file recommendation |
| Timeline | trend forecast |
| Data Quality | quality score and confidence |

No fake evidence is generated.

---

## Confidence

Confidence is calculated from:

- Evidence count
- Evidence polarity
- Data Quality
- Cross CSV
- Timeline
- Engine Stability
- Contradictions
- Open Questions

Confidence labels:

- High
- Medium
- Low
- Insufficient

---

## Hypothesis Score

Hypothesis Score is shown as `0-100`.

It is a research-priority score only. It is not a trading signal and does not change any rule.

---

## Contradiction

Contradiction lists evidence that conflicts with the hypothesis.

Examples:

- Low PF despite positive hypothesis
- Low Data Quality
- Weak Engine Stability
- Rejected Research Manager decision

---

## Open Questions

Open Questions highlight missing data.

Examples:

- NearMiss不足
- Session不足
- EngineActivity不足
- TradeHistory不足
- Cross CSV不足
- Engine DNA不足
- Knowledge Graph不足
- Evidence不足

---

## Research Flow

```text
Hypothesis
↓
Evidence
↓
Validation
↓
Decision
↓
Archive
```

---

## Dashboard

Dashboard shows Hypothesis Summary:

- Hypotheses
- Top Hypothesis
- Top Score
- Confidence
- Evidence
- Open Questions

---

## AI Research Brain

AI Research Brain receives Hypothesis Summary:

- Top Hypothesis
- Confidence
- Evidence
- Verified
- Rejected
- Open Questions

---

## Markdown Output

`ResearchReport.md` includes:

- Hypothesis Summary
- Hypothesis List
- Evidence
- Contradictions
- Open Questions

---

## Analyzer Snapshot JSON

Analyzer Snapshot includes:

- `hypothesis`
- `hypothesisSummary`
- `evidenceSummary`
- `contradictions`
- `openQuestions`

---

## Safety Boundary

Research Hypothesis never:

- edits EA files
- edits CSV files
- rewrites CSV
- changes trading conditions
- performs auto optimization
- calls AI APIs
- generates fake data
- guarantees profit
