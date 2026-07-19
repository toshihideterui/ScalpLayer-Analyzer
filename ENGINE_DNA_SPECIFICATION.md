# Engine DNA Specification v4.5

## Purpose

Engine DNA Analyzer is a research-only module for ScalpLayer Research Lab v4.5.

It analyzes each Engine as a pattern:

- performance
- activity
- NearMiss behavior
- Signal behavior
- condition bottlenecks
- session tendency
- evolution from snapshots

It does not modify EA code, CSV files, or trading conditions.

---

## Input Sources

Engine DNA uses the following loaded data when available:

| Source | Use |
|---|---|
| `TradeHistory.csv` | Trade count, win rate, profit factor, expectancy, holding, spread, RSI, ATR, win/loss profile |
| `NearMissHistory.csv` | NearMiss count, TopNG, hidden opportunity, weakness |
| `EngineActivity.csv` / `EngineActivity_v2.csv` | Checks, TimeOK, FullSignal, EntryRate, TopNG |
| `ScalpLayer_Integrated_signal_log.csv` | Signal count |
| `SessionResearch.csv` | Session tendency |
| `ResearchHistory.json` | Engine Evolution |

Missing CSV files are skipped safely.

---

## DNA Profile Fields

| Field | Meaning |
|---|---|
| Research Score | Composite score for research priority and engine quality |
| Confidence | Reliability level based on available sample size |
| Trade Count | Executed trades for the engine |
| NearMiss Count | Almost-entry records for the engine |
| Signal Count | Signal records for the engine |
| TopNG | Most frequent blocking conditions |
| Session | Dominant session |
| Average Holding | Average holding minutes |
| Average Spread | Average spread at trade records |
| Average RSI | Average RSI at trade records |
| Average ATR | Average ATR at trade records |
| Average Win | Average winning pips |
| Average Loss | Average losing pips |
| Expectancy | Average pips per trade |
| Profit Factor | Gross profit / gross loss |
| Win Rate | Winning trade ratio |

---

## Engine Personality

The Analyzer assigns one personality label per Engine.

Possible labels:

- Momentum
- Trend
- Reversal
- High Frequency
- Rare Entry
- Stable
- Aggressive
- Conservative
- Experimental
- Unknown

This is a rule-based label. It is not an AI prediction and it is not a trading recommendation.

---

## Engine Similarity

Similarity compares Engine DNA fields such as:

- personality
- cluster
- dominant session
- TopNG
- win rate
- profit factor
- expectancy
- trade count
- NearMiss count

The result is shown as a percentage.

---

## Engine Cluster

Engines are grouped into clusters:

- Trend Group
- Momentum Group
- Rare Entry Group
- Experimental Group
- Stable Group
- Research Group

The cluster helps compare engines with similar behavior.

---

## Strength and Weakness

Strength is extracted from positive patterns such as:

- high win rate
- high profit factor
- positive expectancy
- stable loss profile
- strong session tendency
- useful sample size

Weakness is extracted from research risks such as:

- low trade count
- high NearMiss count
- low confidence
- negative expectancy
- high average loss
- repeated TopNG bottleneck

---

## Hidden Opportunity

Hidden Opportunity highlights engines where:

- executed trades are low
- NearMiss count is high
- Signal count is high

These are not automatic improvement instructions. They are Research candidates.

---

## Engine Evolution

Engine Evolution reads past `ResearchHistory` snapshots and compares Engine DNA score changes.

Status labels:

- Improving
- Worsening
- Stable
- Not Enough Data

At least two compatible snapshots are required for meaningful evolution analysis.

---

## Output

Engine DNA appears in:

- Dashboard: Top Engine DNA
- Engine DNA tab
- AI Research Brain: Engine DNA Summary
- `ResearchReport.md`
- Analyzer Snapshot JSON fields:
  - `engineDNA`
  - `engineCluster`
  - `engineSimilarity`
  - `engineEvolution`

---

## Safety Boundary

Engine DNA Analyzer is research-only.

It never:

- changes EA files
- changes CSV files
- changes trading conditions
- sends orders
- calls AI APIs
- guarantees profit
- performs automatic optimization
