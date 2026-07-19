# Research Manager Reliability Test v3.2.1

## Scope

This test report covers the v3.2.1 Integration & Reliability Edition changes.

The goal is reliability improvement only. EA logic, CSV files, trading conditions, and profit assumptions are not changed.

## Checked Items

| Item | Result | Note |
| --- | --- | --- |
| Import result format | Pass | Returns `{ ok, items, warnings, version, duplicates }` on success |
| Import failure format | Pass | Returns `{ ok:false, error }` on failure |
| Broken JSON handling | Pass | Broken JSON is caught and reported |
| Duplicate ID merge | Pass | Imported duplicate IDs are merged by `updatedAt` |
| Unknown fields | Pass | Unknown fields create warnings, import continues |
| Evidence schema | Pass | Evidence is normalized to `id/date/type/title/value/note/source/snapshotId/createdAt` |
| Decision Log | Pass | Decision changes append structured decision log entries |
| History | Pass | Created, Updated, Status Changed, Priority Changed, Decision Changed, Evidence Added are recorded |
| Templates | Pass | RequiredData, SuccessCriteria, FailureCriteria, Tags are applied |
| Duplicate Research candidate | Pass | Add from Research Intelligence detects title/engine/condition/session/category duplicates |
| Board statuses | Pass | All Research statuses are displayed |
| Research Card | Pass | Card displays title, engine/category, priority, score, confidence, progress, health, next action, updated time |
| Progress | Pass | Evidence, decision, result summary, required data and validation plan are included |
| Health | Pass | Warning and Review Required were added |
| Analyzer Snapshot | Pass | Dataset, trade, NearMiss, TopNG, engine, session, research, validation and CSV types are saved |
| Markdown export | Pass | History, evidence, decision log, snapshot and progress are included |
| JSON export | Pass | Items, settings, history and analyzer snapshots are included |
| Storage errors | Pass | localStorage errors are stored and displayed without stopping Analyzer |

## Syntax Checks

Executed:

```text
node --check researchStorage.js
node --check researchManager.js
node --check researchTemplates.js
node --check script.js
```

Result:

```text
0 syntax errors
```

## Prohibited Changes Confirmation

| Prohibited Change | Status |
| --- | --- |
| EA code changes | Not changed |
| CSV rewriting | Not changed |
| Trading condition changes | Not changed |
| Profit guarantee | Not added |
| Analyzer prediction guarantee | Not added |

## Notes

v3.2.1 is not a feature expansion release. It is a reliability release for daily Research Manager operation.
