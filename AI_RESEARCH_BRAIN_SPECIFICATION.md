# AI Research Brain Specification v4.0

## Purpose

AI Research Brain is the third layer of ScalpLayer Research Lab.

```text
Analyzer
  ↓
Research Manager
  ↓
AI Research Brain
```

Analyzer reads CSV files.  
Research Manager manages research items.  
AI Research Brain reviews the whole research workflow and suggests what to research next.

No AI API is used in v4.0. The Brain is rule-based.

## Prohibited Actions

- Do not rewrite EA code.
- Do not rewrite CSV files.
- Do not change trading conditions.
- Do not guarantee profit.
- Do not use external AI APIs.
- Do not treat recommendations as direct EA changes.

## Added Files

| File | Role |
| --- | --- |
| `recommendationEngine.js` | Prioritizes Research items |
| `knowledgeEngine.js` | Builds searchable knowledge from completed/reviewed Research |
| `brainEngine.js` | Combines Recommendation, Knowledge, Roadmap, Risk and Insight |

## New UI Tab

`AI Research Brain`

Sections:

- Research Overview
- Today's Research Top5
- Research Priority Ranking
- Research Bottleneck
- Required Data Forecast
- Research Roadmap
- Research Timeline 2.0
- Research Quality Statistics
- Research Risk
- Knowledge Base
- Research Cluster
- Research Insight
- Weekly / Monthly Summary

## Recommendation Engine

Research priority is calculated from:

- Priority
- Research Score
- Confidence
- Progress
- Health
- Evidence count
- Status
- Decision state
- Stale state

The output is a rule-based Research recommendation, not a trading decision.

## Knowledge Engine

Knowledge Base is generated from Research items that are:

- Completed
- Rejected
- Adopted
- Have a non-Undecided decision

Fields used:

- Title
- Hypothesis
- Result
- Decision
- Evidence
- Conclusion
- Tags
- Engine
- Condition
- Session

## Similarity

Similarity is calculated from:

- Title token overlap
- Engine
- Condition
- Session
- Tags
- Category

This is used to detect related Research and duplicate knowledge candidates.

## Research Quality Score

Research Quality Score is different from trading performance.

It evaluates research quality using:

- Research Score
- Confidence
- Progress
- Evidence
- Decision
- History
- Validation Plan
- Snapshot
- Health

## Required Data Forecast

Required Data Forecast scans each Research item and checks whether the needed CSV types appear to be loaded.

Examples:

- `TradeHistory.csv`
- `NearMissHistory.csv`
- `EngineActivity_v2.csv`
- `SessionResearch.csv`

## Research Risk

Risks detected:

- Low Evidence
- Old Snapshot
- Low Confidence
- High Score / Low Confidence
- Stale

## Weekly / Monthly Summary

The Brain summarizes:

- Added Research
- Completed Research
- Evidence added
- Decisions recorded

## Design Principle

AI Research Brain is a Research Advisor.

It helps decide:

- What should be researched today?
- Which Research is blocked?
- Which Research has enough evidence?
- Which Research should be reviewed?
- Which CSV is still missing?

It does not decide:

- Buy or sell
- Lot size
- Profit prediction
- Immediate EA changes

## Future Expansion

The architecture can later connect to:

- OpenAI
- Claude
- Groq
- Gemini

v4.0 does not connect to these APIs.
