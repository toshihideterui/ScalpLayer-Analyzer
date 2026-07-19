# Research Timeline & Trend Analysis Specification

Version: ScalpLayer Research Lab v4.4

## Purpose

Research Timeline & Trend Analysis visualizes whether ScalpLayer Research is improving over time.

It uses:

- `ResearchHistory.json`
- Analyzer snapshots stored in localStorage
- Research Manager item history
- Research Manager decision logs

It does not modify:

- EA source code
- CSV files
- Trading rules
- Research Recommendation logic
- Cross CSV logic
- Performance cache logic

---

## Main Components

### Long Term Trend

Shows daily, weekly, and monthly trend rows.

Metrics:

- Research Score
- Data Quality
- Correlation Score
- Opportunity Score
- Confidence
- WinRate
- ProfitFactor
- NearMiss
- Trade count
- CSV count

### Trend Chart

Displays:

- Research Score
- Correlation
- Quality
- Confidence

### Improvement Analysis

Compares the latest snapshot with the previous snapshot.

Metrics:

- Research Score
- WinRate
- NearMiss
- Correlation
- Quality
- Opportunity
- ProfitFactor
- Trade
- CSV

### Best Snapshot

Shows historical best records for:

- Research Score
- Correlation
- Quality
- Confidence
- WinRate
- ProfitFactor

### Worst Snapshot

Shows historical weakest records and probable reasons:

- CSV missing
- NearMiss insufficient
- Trade insufficient
- Data Quality weak
- Correlation weak

### Trend Forecast

This is not a market prediction.

It classifies Research tendency as:

- Improving
- Stable
- Declining

Targets:

- Research Quality
- Cross CSV
- Confidence
- Data Collection
- Trade Volume
- NearMiss Collection

### Milestones

Tracked milestones:

- First 100 Trades
- Research Score 80
- Quality 90
- Correlation 80
- NearMiss 100
- Research 100

### Timeline Events

Events include:

- CSV snapshot
- Research item history
- Decision
- Adopt
- Reject
- Snapshot

---

## Research Manager Snapshot

Analyzer Snapshot includes:

- `timeline`
- `trend`
- `milestones`
- `bestSnapshot`
- `worstSnapshot`
- `trendSummary`

---

## Markdown Export

`ResearchReport.md` includes:

- Research Timeline
- Trend
- Improvement
- Best Snapshot
- Worst Snapshot
- Milestones
- Trend Recommendation

---

## Safety

v4.4 is a timeline and trend visualization layer only.

It must not:

- Change EA files
- Change CSV files
- Change trading rules
- Generate fake CSV data
- Generate fake trades
- Use AI APIs
- Guarantee profit
