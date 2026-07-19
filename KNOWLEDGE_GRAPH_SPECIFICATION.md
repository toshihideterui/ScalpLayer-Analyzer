# Knowledge Graph Specification v5.0

## Purpose

Research Knowledge Graph turns ScalpLayer Research Lab into a research knowledge platform.

It visualizes relationships between:

- Engine
- Condition
- Session
- TopNG
- Research
- Signal / NearMiss / Trade / Win flow

The goal is to understand what to research next without changing the EA, CSV, or trading conditions.

---

## Safety Boundary

Knowledge Graph is research-only.

It never:

- edits EA files
- edits CSV files
- changes trading conditions
- performs auto optimization
- calls AI APIs
- generates fake data
- guarantees profit

---

## Input Data

The module uses existing Analyzer data only:

| Source | Use |
|---|---|
| `TradeHistory.csv` | Trade node and performance relation |
| `NearMissHistory.csv` | NearMiss and TopNG relation |
| `EngineActivity.csv` / `EngineActivity_v2.csv` | Engine node, TopNG, activity relation |
| `ScalpLayer_Integrated_signal_log.csv` | Signal flow |
| `SessionResearch.csv` | Session node and session flow |
| `ResearchHistory.json` | historical context |
| Research Manager | Research nodes and dependency graph |
| Engine DNA | Engine similarity, hidden opportunity, cluster |

No new CSV is required.

---

## Nodes

| Node Type | Examples | Main Fields |
|---|---|---|
| Engine | Core Rule E, Candidate G, Morning Prime | Research Score, Confidence, Trade Count, NearMiss, Signal Count, Session, WinRate, ProfitFactor, Expectancy |
| Condition | RSI, ATR, BB, Spread, Volume, Time | condition name |
| Session | Tokyo, London, NewYork, Other | trades, NearMiss, score |
| TopNG | RSI NG, ATR NG, Volume NG | count |
| Research | Research Manager items | status, priority, category, engine |
| Flow | Signal, NearMiss, Trade, Win | flow count |

---

## Edges

| Edge Type | Meaning |
|---|---|
| EngineTopNG | Engine is blocked by TopNG |
| TopNGCondition | TopNG belongs to a condition |
| EngineSession | Engine is related to a session |
| EngineResearch | Research item is related to an Engine |
| ConditionResearch | Research item mentions or targets a condition |
| OpportunityFlow | Signal -> NearMiss -> Trade -> Win / TopNG -> Research |
| ResearchDependency | Research items share engine, category, or tags |

---

## Screens

Knowledge Graph tab contains:

- Knowledge Graph
- Engine Network
- Research Network
- Cluster Tree
- Opportunity Flow
- Session Flow
- TopNG Network
- Dependency Graph
- Statistics

---

## Dashboard Summary

Dashboard shows:

- Largest Cluster
- Most Connected Engine
- Most Connected TopNG
- Research Hub
- Graph Density

---

## AI Research Brain

AI Research Brain receives Knowledge Graph Insight.

Example:

```text
Core Rule E is the most connected Engine in the research graph.
RSI is the strongest TopNG bottleneck hub.
NearMiss to TopNG flow is active. Treat this as Research target, not automatic condition change.
```

---

## Markdown Output

`ResearchReport.md` includes:

- Graph Summary
- Largest Cluster
- Research Hub
- Top Connected Engine
- Top Connected TopNG
- Opportunity Flow
- Dependency Summary
- Graph Statistics

---

## Analyzer Snapshot JSON

The snapshot includes:

- `knowledgeGraph`
- `graphSummary`
- `largestCluster`
- `researchHub`
- `topConnectedEngine`
- `graphStatistics`
- `dependencyGraph`

---

## Public API

`knowledgeGraphEngine.js` exposes one public method:

```javascript
snapshot()
```

The method returns a complete graph snapshot generated from existing Analyzer data.
