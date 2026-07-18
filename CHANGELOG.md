# CHANGELOG

## v4.0 AI Research Brain Edition

### Added

- AI Research Brain tab
- Research Overview
- Today's Research Top5
- Research Priority Ranking
- Research Dependency view
- Research Roadmap
- Research Timeline 2.0
- Research Quality Statistics
- Research Bottleneck detection
- Required Data Forecast
- Research Queue
- Research Risk
- Knowledge Base
- Knowledge Search foundation
- Similar Research scoring
- Research Cluster view
- Duplicate Knowledge detection
- Research Quality Score
- Weekly Summary
- Monthly Summary
- `recommendationEngine.js`
- `knowledgeEngine.js`
- `brainEngine.js`
- `AI_RESEARCH_BRAIN_SPECIFICATION.md`

### Design

- ScalpLayer now has a three-layer structure:
  - Analyzer
  - Research Manager
  - AI Research Brain
- AI Research Brain is rule-based and does not use external AI APIs.
- Recommendations are Research candidates, not trading-condition changes.

### Not Changed

- No EA code changes
- No CSV rewriting
- No trading-condition changes
- No profit guarantee
- No AI API calls

## v3.2.1 Integration & Reliability Edition

### Fixed

- Unified Research Manager import/export result format
- Improved broken JSON handling during import
- Added import validation for version, schema, duplicate IDs and unknown fields
- Unified Evidence structure
- Added Decision Log persistence
- Expanded Research History event types
- Improved Research Template field application
- Added duplicate detection when adding Research Intelligence candidates
- Expanded Research Board to all statuses
- Improved Research Card content
- Improved Research Progress calculation
- Added Warning and Review Required health states
- Improved Analyzer Snapshot content
- Improved Markdown export completeness
- Improved JSON backup completeness
- Added localStorage error reporting to Research Manager UI

### Reliability

- Import now returns `{ ok, items, warnings, version, duplicates }`
- Import failure now returns `{ ok:false, error }`
- Duplicate IDs are merged by `updatedAt`
- Existing records are preserved when imported records are older
- Analyzer no longer stops when Research Manager storage has an error

### Not Changed

- No EA code changes
- No CSV rewriting
- No trading-condition changes
- No profit guarantee
- No external AI API calls

## v3.2 Research Workflow & AI Research Manager Edition

### Added

- Research Manager tab
- Research Board tab
- Research Portfolio tab
- Research Item schema
- Research templates
- Hypothesis management
- Validation plan management
- Success / failure criteria fields
- Evidence log
- Decision log
- Priority and status workflow
- Analyzer snapshot saved to each Research item
- JSON export / import as `ScalpLayer_Research_Manager.json`
- Markdown export per Research item
- Portfolio metrics
- Priority matrix
- Stale Research warning
- `researchTemplates.js`
- `researchStorage.js`
- `researchManager.js`
- `RESEARCH_MANAGER_SPECIFICATION.md`
- `RESEARCH_WORKFLOW_GUIDE.md`

### Improved

- Research Intelligence cards can now be registered directly into Research Manager
- README was rewritten in clean Japanese to remove mojibake
- Research workflow is now explicit: candidate -> hypothesis -> validation -> evidence -> decision

### Not Changed

- No EA code changes
- No CSV rewriting
- No trading-condition changes
- No automatic EA adoption
- No external AI API calls

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
