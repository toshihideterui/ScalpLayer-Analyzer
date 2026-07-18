# CSV Specification v5.3

ScalpLayer Research Lab reads CSV files exported by ScalpLayer Integrated EA.

The Analyzer does not modify CSV files. It only normalizes column names internally and analyzes the loaded data in the browser.

---

## CSV Schema Version

```text
CSV_SCHEMA_VERSION = 4.0.1
Analyzer Edition = v5.3 Hypothesis Lineage & Evidence Weighting Edition
```

v5.3 does not require a new CSV format. It adds Hypothesis Lineage, Evidence Weighting, Hypothesis History, Validation Readiness, and Hypothesis Compare on top of existing Analyzer results.

The CSV schema version remains `4.0.1`.

v5.3 localStorage keys:

- `scalplayerHypothesisLineage`
- `scalplayerEvidenceWeights`
- `scalplayerHypothesisHistory`
- `scalplayerHypothesisReview`

No EA changes, no CSV changes, and no trading-condition changes are included in v5.3.

---

## Supported CSV

| CSV | Purpose | Main Screen | Cross CSV Use |
|---|---|---|---|
| `TradeHistory.csv` | Executed trade history | Dashboard / Trade | WinRate, Profit, AveragePips, Engine performance |
| `NearMissHistory.csv` | Almost-entry records | NearMiss / Research Intelligence | Bottleneck and opportunity detection |
| `EngineActivity.csv` | Engine activity stats v1 | Engine / Research Intelligence | Checks, TimeOK, FullSignal, Entries, TopNG |
| `EngineActivity_v2.csv` | Engine activity stats v2 | Engine / Research Intelligence | Preferred Engine Activity source |
| `EngineRuntime.csv` | Engine ACTIVE / WAIT runtime history | CSV Manager | Reserved for future runtime correlation |
| `SessionResearch.csv` | Session-level condition stats | Session | Session correlation and condition rates |
| `ScalpLayer_Integrated_signal_log.csv` | Integrated EA signal history | Signal | Signal to Entry to Trade flow |
| `ScalpLayer_CoreRuleE_signal_log.csv` | Core Rule E signal history | Signal | Signal Log compatible source |

Unknown CSV files are skipped safely and shown in CSV Manager.

---

## Detection Order

CSV type is detected in this order:

1. Exact file name
2. Partial file name
3. Required header set
4. Header pattern
5. Unknown

---

## Column Alias Normalization

The Analyzer accepts common column aliases and normalizes them internally.

Examples:

| Canonical | Accepted Aliases |
|---|---|
| `Engine` | `engine`, `EngineName`, `rule`, `Strategy` |
| `Session` | `session`, `MarketSession` |
| `Direction` | `BUYSELL`, `Side`, `side` |
| `Spread` | `SpreadPips`, `spread_pips` |
| `Pips` | `pips`, `ProfitPips` |
| `Profit` | `ProfitYen`, `profit` |
| `HoldingMinutes` | `Holding`, `HoldingTime` |

Signal Log compatibility:

- If a signal CSV uses `rule`, it is treated as `Engine`.
- Empty recognized CSV files are accepted as recognized-empty data.

---

## Cross CSV Intelligence v4.2

Cross CSV Intelligence analyzes relationships between loaded CSV files.

It combines:

```text
TradeHistory
  x NearMiss
  x Signal Log
  x Engine Activity
  x Session Research
```

It displays:

- Cross Summary
- Engine Correlation
- Session Correlation
- NearMiss Correlation
- Signal Correlation
- Opportunity Matrix
- Correlation Score
- Cross Warning
- Cross Recommendation

Missing CSV files are skipped and reported as Cross Warning.

See `CROSS_CSV_INTELLIGENCE_SPECIFICATION.md` for full details.

---

## Safety Rules

The Analyzer never:

- Changes EA source code
- Changes trading conditions
- Rewrites CSV files
- Creates fake trades
- Creates fake NearMiss rows
- Guarantees profit
- Calls external AI APIs

All output is for Research planning only.
