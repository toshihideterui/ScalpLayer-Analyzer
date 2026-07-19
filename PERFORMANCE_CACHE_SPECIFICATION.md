# Performance & Cache Specification

Version: ScalpLayer Research Lab v4.3

## Purpose

v4.3 improves performance without changing analysis results.

It does not change:

- EA source code
- CSV files
- Trading rules
- Research Recommendation logic
- Opportunity Score logic
- Correlation Score logic

---

## Analysis Version

`AnalysisEngine.analysisVersion` is incremented when:

- CSV files are loaded
- Analyzer is reset

Snapshot caches use this value. If the version is unchanged, cached results are reused.

---

## Snapshot Cache

Cached snapshots:

- Data Quality
- Cross CSV Intelligence
- AI Research Brain

Cache location:

```text
analysisEngine._snapshotCache
```

Cache key:

```text
analysisVersion
```

If `analysisVersion` changes, caches are invalidated.

---

## Performance Utility

New file:

```text
performanceUtil.js
```

Responsibilities:

- `startTimer(name)`
- `stopTimer(name)`
- `memoryUsage()`
- `cacheHit(name)`
- `cacheMiss(name)`
- `analysisStatistics(engine)`

Memory usage is shown as `N/A` when the browser does not expose memory data.

---

## Lazy Render

Before v4.3:

```text
renderAll()
  -> render every tab
```

v4.3:

```text
renderAll()
  -> renderStatus()
  -> renderActiveTab()
```

Only the active tab is rendered. Switching tabs renders the selected tab.

---

## Virtual Table

Tables with more than 1000 rows are not rendered fully at once.

Initial display:

```text
100 rows
```

Each `Load More` click adds:

```text
100 rows
```

This reduces DOM load for large CSV files.

---

## Performance Monitor

Dashboard shows:

- Analysis Time
- Cross CSV Time
- Brain Time
- Data Quality Time
- Memory
- Analysis Version
- Cache Hit Rate
- Cache Status

Cross CSV Intelligence shows:

- Cross Analysis Time
- Correlation Count
- Cache Status
- Analysis Version

AI Research Brain shows:

- Analysis Version
- Cache Status
- Cross CSV Cache
- Brain Cache
- Data Quality Cache
- Memory

---

## Markdown Export

`ResearchReport.md` includes:

- Analysis Time
- Cross CSV Time
- Brain Time
- Data Quality Time
- Memory
- Cache Status
- Cache Hit Rate
- Analysis Version

---

## Test Policy

Required behavior:

- CSV load performs analysis once.
- Reopening Cross CSV tab reuses cache.
- Reopening Brain tab reuses cache.
- Markdown export reuses cache.
- CSV reload invalidates cache.
- Existing Analyzer features remain available.

---

## Safety

v4.3 is a performance layer only.

It must not:

- Rewrite EA files
- Rewrite CSV files
- Change trading conditions
- Create fake data
- Call external AI APIs
