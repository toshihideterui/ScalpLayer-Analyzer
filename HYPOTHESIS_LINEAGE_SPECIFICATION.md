# Hypothesis Lineage Specification v5.3

## Purpose

Hypothesis Lineage extends Research Hypothesis by tracking relationships, evidence weight, validation readiness, and change history.

This feature is research-only.
It does not change EA files, CSV files, or trading conditions.

---

## Safety Boundary

Forbidden:

- EA code changes
- CSV file changes
- CSV rewriting
- Trading-condition changes
- Auto optimization
- Auto operation
- Auto trading
- AI API calls
- Fake data generation
- Fake evidence generation
- Profit guarantee
- Trading signal generation

---

## Input Sources

The engine reads existing Analyzer results:

- Research Manager
- Research Hypothesis
- Trade
- NearMiss
- Engine DNA
- Cross CSV
- Knowledge Graph
- Timeline
- Data Quality

No new CSV schema is introduced.

`CSV_SCHEMA_VERSION` remains:

```text
4.0.1
```

---

## Hypothesis Relation Types

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

Relations are stored in:

```text
scalplayerHypothesisLineage
```

Duplicate edges with the same `sourceId`, `targetId`, and `relationType` are not created.

---

## Evidence Weighting

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

Weights are editable from 0.00 to 2.00 in steps of 0.05.

Storage key:

```text
scalplayerEvidenceWeights
```

---

## Weighted Evidence Score

Formula:

```text
Weighted Score = Source Weight * Polarity Weight * Evidence Strength
```

Polarity Weight:

| Polarity | Weight |
|---|---:|
| Support | 1.00 |
| Neutral | 0.25 |
| Contradiction | -1.00 |

Evidence Strength:

| Strength | Weight |
|---|---:|
| High | 1.00 |
| Medium | 0.70 |
| Low | 0.40 |
| Unknown | 0.25 |

---

## Evidence Strength Rules

Trade:

- Trade Count >= 50: High
- Trade Count >= 20: Medium
- Trade Count >= 1: Low
- Trade Count = 0: Unknown

NearMiss:

- NearMiss Count >= 100: High
- NearMiss Count >= 30: Medium
- NearMiss Count >= 1: Low

Data Quality:

- Quality Score >= 80: High
- Quality Score >= 60: Medium
- Quality Score >= 1: Low

Cross CSV:

- Correlation Score >= 75: High
- Correlation Score >= 50: Medium
- Correlation Score >= 1: Low

Engine DNA:

- Confidence High: High
- Confidence Medium: Medium
- Otherwise: Low or Unknown

Timeline:

- Snapshot Count >= 6: High
- Snapshot Count >= 3: Medium
- Snapshot Count 1-2: Low

Knowledge Graph:

- Degree >= 10: High
- Degree >= 4: Medium
- Degree >= 1: Low

---

## Hypothesis Score 2.0

Score range:

```text
0-100
```

Score items:

- Base Evidence
- Quality Bonus
- Cross CSV Bonus
- Stability Bonus
- Timeline Bonus
- Validation Bonus
- Contradiction Penalty
- Open Question Penalty
- Lineage Penalty
- Duplicate Penalty
- Superseded Penalty
- Final Score

Existing Research Score and Opportunity Score are not changed.

---

## Confidence 2.0

Confidence labels:

- High
- Medium
- Low
- Insufficient

Additional field:

```text
Confidence Percent
```

Inputs:

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

Readiness range:

```text
0-100
```

Labels:

- Ready
- Almost Ready
- Needs Evidence
- Needs Definition
- Blocked

---

## Validation Checklist

Checklist:

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

Manual review fields are stored in:

```text
scalplayerHypothesisReview
```

---

## Hypothesis Family

Families are generated from relation types:

- Parent
- Child
- Derived From
- Requires

Each family includes:

- Family Name
- Root Hypothesis
- Hypothesis Count
- Verified Count
- Rejected Count
- Average Score
- Average Confidence
- Evidence Count
- Contradiction Count
- Open Question Count

---

## Duplicate Detection

Similarity inputs:

- Hypothesis Title
- Hypothesis text
- Engine
- Condition
- Session
- Tags

Similarity >= 80% is shown as `Possible Duplicate`.

Duplicates are not merged automatically.

---

## Superseded Hypothesis

If a `Supersedes` relation exists, the older hypothesis is shown as superseded.

Status is not automatically changed to Archived.

---

## Orphan Hypothesis

A hypothesis with no relation is shown as Orphan.

Orphan is not an error.
The UI shows a suggested relation candidate when possible.

---

## Hypothesis History

History storage key:

```text
scalplayerHypothesisHistory
```

Stored events:

- Status Change
- Score Change
- Confidence Change
- Evidence Added
- Evidence Removed
- Relation Added
- Relation Removed
- Note Updated
- Verified
- Rejected
- Archived
- Superseded
- Evidence Weighted

The latest 500 events are retained.

---

## Snapshot Fields

Analyzer Snapshot includes:

- `hypothesisLineage`
- `hypothesisRelations`
- `hypothesisFamilies`
- `hypothesisLineageSummary`
- `evidenceWeights`
- `weightedEvidenceSummary`
- `hypothesisScore2`
- `hypothesisConfidence2`
- `validationReadiness`
- `validationChecklist`
- `hypothesisHistory`
- `duplicateHypotheses`
- `orphanHypotheses`
- `supersededHypotheses`
- `hypothesisCompareSummary`

Research History Snapshot stores summary values only:

- `hypothesisLineageSummary`
- `hypothesisFamilyCount`
- `hypothesisRelationCount`
- `orphanHypothesisCount`
- `duplicateHypothesisCount`
- `averageWeightedEvidence`
- `averageValidationReadiness`
- `topHypothesisScore2`
- `topHypothesisConfidencePercent`

---

## Performance Limits

Target limits:

- Hypothesis: 500
- Relation: 2000
- History: 500

Implementation notes:

- Use Map and Set for lookups.
- Avoid repeated full pair comparisons when possible.
- Duplicate detection is limited to normalized keys.
- UI remains lazy-rendered by tab.
- Large tables should remain compact.
