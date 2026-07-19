# Research Data Quality Specification v4.1

## Purpose

Research Data Quality evaluates whether loaded CSV data is reliable enough for ScalpLayer Research.

It does not change:

- EA code
- CSV files
- Trading conditions
- Profit calculation
- Research decisions

## Overall Quality Score

100-point score.

| Component | Points |
| --- | ---: |
| TradeHistory | 25 |
| NearMiss | 20 |
| Signal Log | 20 |
| Engine Activity | 15 |
| Session Research | 10 |
| CSV Structure | 10 |

Penalties may be applied for:

- Missing required columns
- Duplicate rows
- Duplicate trade/timestamp/signal
- Session imbalance
- Engine imbalance
- Sparse time coverage
- Old CSV files

## Data Quality Labels

| Score | Label |
| ---: | --- |
| 85-100 | Excellent |
| 70-84 | Good |
| 50-69 | Fair |
| 0-49 | Poor |

## Confidence

Overall confidence is calculated from:

- Data Volume
- Coverage
- Balance
- Continuity
- Consistency
- Freshness

Labels:

- High
- Medium
- Low

## CSV Health Dashboard

Each CSV receives:

- Health stars
- Rows
- Status

## Missing Data Analysis

Tracks:

- Missing Columns
- Missing Values
- Missing Session
- Missing Engine
- Missing Date
- Missing Time
- Missing Price
- Missing Pips

## Duplicate Analysis

Tracks:

- Duplicate Rows
- Duplicate IDs
- Duplicate Trade
- Duplicate Timestamp
- Duplicate Signal

## Balance Analysis

Session balance:

- Tokyo
- London
- NY
- Other

Engine balance:

- Trades
- Signals
- NearMiss

## Time Coverage

Tracks:

- Start Date
- End Date
- Total Days
- Observed Days
- Missing Days
- Continuous Days

## Freshness

Tracks:

- Newest CSV
- Oldest CSV
- CSV Age Days

## Markdown / Snapshot

Data Quality is added to:

- `ResearchReport.md`
- Research Manager Analyzer Snapshot

## Important

Low Data Quality does not mean the EA is bad.

It means the current CSV set may not be reliable enough for strong Research conclusions.
