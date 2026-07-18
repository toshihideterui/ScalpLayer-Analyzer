# CHANGELOG

## v3.1 Stabilization & Deep Research Edition

### Added

- CSV validation status and warnings
- Duplicate CSV replacement notice
- Dataset fingerprint for duplicate ResearchHistory prevention
- Research Score 3.0 breakdown
- Confidence display
- NearMiss Deep Analysis
- Single Bottleneck Research
- Condition State Pattern ranking
- Holding Analysis
- Spread Analysis
- Session Condition Matrix
- Engine filter UI
- Analysis Warnings panel
- Extended Markdown report sections
- `RESEARCH_SCORE_SPECIFICATION.md`
- Test CSV files under `tests/`

### Improved

- DOM event binding is now guarded against missing elements
- Analyzer continues even when one CSV has warnings
- Research report includes dataset summary and validation results
- ResearchHistory stores dataset range, CSV types, validation warnings, engine health, condition rank and session rank
- Engine Medical Chart now shows Score Detail and Confidence

### Not Changed

- No EA code changes
- No CSV rewriting
- No trading-condition changes
- No external AI API calls

## v3.0 AI Research Lab Edition

### Added

- AI Research Report
- Engine Medical Chart
- Engine Evolution enhancement
- Condition Intelligence
- TopNG HeatMap
- Session HeatMap
- Research Progress gauge
- Research Score 2.0
- Research Lab Dashboard
- AI Prompt Builder enhancement
- Research Comparison
- Expanded Research Database fields
- Markdown export as `ResearchReport.md`
- `AIAnalysisEngine` placeholder class

### Changed

- Product name changed to `ScalpLayer Research Lab`
- UI copy reorganized for Research Lab positioning
- Main UI labels moved mostly to English to reduce mojibake risk
- Research Intelligence is now treated as the core command center

### Not Changed

- No EA code changes
- No CSV rewriting
- No trading-condition changes
- No external AI API calls

## v2.0 Research Intelligence Edition

- Research Intelligence tab
- Research Timeline tab
- Research Score
- Engine Health
- Engine Radar
- NearMiss bottleneck ranking
- Research Memo
- ResearchHistory download

## v1.0

- Basic CSV analyzer
- Dashboard
- Trade Analysis
- Engine Analysis
- NearMiss Analysis
- Session Analysis
- Signal Analysis
- CSV Manager
