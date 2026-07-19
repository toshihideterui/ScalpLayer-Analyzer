# CSV Compatibility Test v4.0.1

## Scope

This report covers CSV Compatibility & Schema Stabilization changes.

## Supported CSV

| CSV | Expected |
| --- | --- |
| `TradeHistory.csv` | Parsed as TradeHistory |
| `NearMissHistory.csv` | Parsed as NearMissHistory |
| `EngineActivity.csv` | Parsed as EngineActivity v1 |
| `EngineActivity_v2.csv` | Parsed as EngineActivity v2 |
| `EngineRuntime.csv` | Parsed as EngineRuntime |
| `SessionResearch.csv` | Parsed as SessionResearch |
| `ScalpLayer_Integrated_signal_log.csv` | Parsed as Signal Log |
| `ScalpLayer_CoreRuleE_signal_log.csv` | Parsed as Signal Log |

## Required Test Cases

| Case | Expected Result |
| --- | --- |
| Integrated Signal Log has `rule` but no `Engine` | `rule -> Engine` info, no missing Engine warning |
| CoreRuleE Signal Log is empty | Recognized as Signal Log, empty warning only |
| Unknown CSV | Safely skipped as Unknown CSV |
| Lowercase columns | Resolved through alias or case-insensitive lookup |
| TradeHistory with 2 rows | Dashboard trade counts remain correct |
| NearMissHistory loaded | NearMiss analysis remains available |
| EngineActivity_v2 loaded | Engine health and Research Score remain available |

## Syntax Check

Executed:

```text
node --check analysisEngine.js
node --check script.js
node --check recommendationEngine.js
node --check knowledgeEngine.js
node --check brainEngine.js
```

Result:

```text
0 syntax errors
```

## Prohibited Changes

| Item | Status |
| --- | --- |
| EA code changes | Not changed |
| CSV rewriting | Not changed |
| Trading condition changes | Not changed |
| Profit calculation changes | Not changed |
| AI API addition | Not added |
