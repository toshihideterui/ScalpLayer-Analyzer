# Cross CSV Intelligence Specification

Version: ScalpLayer Research Lab v4.2

## Purpose

Cross CSV Intelligence analyzes relationships between multiple CSV files exported by ScalpLayer Integrated EA.

It does not modify:

- EA source code
- Trading rules
- CSV files
- Lot settings
- Entry or exit logic

The feature only generates Research candidates from CSV relationships.

---

## Supported CSV

| CSV | Purpose | Cross Use |
|---|---|---|
| `TradeHistory.csv` | Executed trades | WinRate, Profit, AveragePips, Engine performance |
| `NearMissHistory.csv` | Almost-entry records | Bottleneck and opportunity detection |
| `ScalpLayer_Integrated_signal_log.csv` | Signal records | Signal to Entry to Trade flow |
| `EngineActivity.csv` | Engine activity summary | Checks, TimeOK, FullSignal, Entries, TopNG |
| `EngineActivity_v2.csv` | Engine activity summary v2 | Preferred Engine Activity source |
| `EngineRuntime.csv` | Runtime status | Future schedule and active/wait analysis |
| `SessionResearch.csv` | Session condition stats | Session-level correlation |

Missing CSV files are skipped safely.

---

## Cross Summary

Shows which CSV files are loaded and how much data is available.

Status:

- `Cross Ready`: 4 or more expected CSV groups loaded
- `Partial Cross`: 2 or 3 expected CSV groups loaded
- `Single CSV`: only 1 expected CSV group loaded
- `No Data`: no usable CSV

---

## Engine Correlation

Engine Correlation combines:

- Trades
- WinRate
- Signals
- Signal Success
- NearMiss
- Engine checks
- TimeOK
- FullSignal
- TopNG
- Confidence
- Data Quality
- Correlation Score

This helps answer:

- Is the Engine actually being checked?
- Does it produce signals?
- Does it produce NearMiss?
- Does it reach Entry?
- Does it win after Entry?

---

## Session Correlation

Session Correlation combines:

- Tokyo
- London
- NY
- Other

For each session:

- Trades
- NearMiss
- Signals
- WinRate
- AveragePips
- Research Score
- Session Opportunity

This helps identify whether a time band needs more Research data.

---

## NearMiss Correlation

NearMiss Correlation compares:

- NearMiss count
- Trade count
- Signal count

Interpretation examples:

- `High NearMiss / Low Trade`: good Research target
- `Research Target`: NearMiss exists and should be compared with TopNG
- `Trade Confirmed`: executed trades exist and can be evaluated

---

## Signal Correlation

Signal Correlation shows:

```text
Signal
  -> Entry
  -> Trade
  -> WinRate
```

Metrics:

- Total Signals
- Total Entries
- Total Trades
- Signal to Entry rate
- Entry to Trade rate
- Signal to Trade rate
- WinRate

---

## Opportunity Matrix

Opportunity Matrix classifies targets into:

- High
- Medium
- Low

Targets can be:

- Engine
- Session

The score is based on:

- NearMiss
- Signals
- TimeOK
- Trades
- AveragePips
- FullSignal without Entry

High opportunity does not mean an immediate rule change. It means the target should be prioritized for Research.

---

## Cross Warning

Warnings are generated when important CSV data is missing.

Examples:

- TradeHistory is missing.
- NearMissHistory is missing.
- Signal Log is missing.
- EngineActivity is missing.
- No executed trades found across engines.

---

## Cross Recommendation

Recommendations are Research candidates generated from the Opportunity Matrix and missing CSV warnings.

Examples:

- `Candidate G Cross Research`
- `Tokyo Cross Research`
- `Collect NearMiss`
- `Collect Signal`

Recommendations must not be treated as direct trading-condition changes.

---

## Integration

v4.2 adds:

- `crossCsvEngine.js`
- `Cross CSV Intelligence` tab
- Cross CSV Insight in `AI Research Brain`
- Cross CSV snapshot in `Research Manager`
- Cross CSV section in `ResearchReport.md`

Dependency flow:

```text
AnalysisEngine
  -> DataQualityEngine
  -> CrossCsvEngine
  -> BrainEngine
```

---

## Safety

This feature:

- Does not call external AI APIs
- Does not rewrite CSV files
- Does not rewrite EA code
- Does not guarantee profit
- Does not create fake trades
- Does not create fake NearMiss records

It only analyzes loaded CSV data in the browser.
