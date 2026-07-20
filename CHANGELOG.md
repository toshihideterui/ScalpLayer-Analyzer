# CHANGELOG

## v6.2 Multi Symbol Foundation Edition

### Added

- Optional `Symbol` column support
- Optional `CurrencyPair` column support
- Legacy CSV fallback to `symbol = "USDJPY"`
- `currentSymbol` in Analyzer Snapshot
- `availableSymbols` in Analyzer Snapshot
- Current Symbol display on Dashboard
- Currency pair column in CSV Manager
- Internal multi-symbol helper functions:
  - `getCurrentSymbol()`
  - `getAvailableSymbols()`
  - `filterBySymbol(symbol)`
  - `groupBySymbol()`

### Compatibility

- CSV schema version was not changed
- Existing USDJPY CSV files remain compatible
- Existing analysis behavior remains USDJPY-first
- No symbol switching UI was added yet

### Not Changed

- No EA changes
- No CSV rewriting
- No trading-condition changes
- No analysis logic changes
- No auto optimization
- No AI API calls

## v6.1 Research Productivity Edition

### Added

- Dashboard productivity bar
- Important Dashboard cards placed near the top
- Dashboard Customize panel
- Dashboard card ON/OFF controls
- Dashboard card order controls
- Dashboard layout persistence with `localStorage`
- Favorite Engine selection
- Favorite Engine fixed Dashboard summary
- Research Snapshot Compare
- Previous snapshot comparison
- Previous-day snapshot comparison
- Last 7 snapshot average comparison
- Improvement / worsening badges
- Fast Search tab
- Full-text search across Research, Hypothesis, Knowledge Graph, TopNG, and Engine data
- Export All button
- Markdown / JSON / CSV batch export
- `ScalpLayer_Research_Export.md`
- `ScalpLayer_AnalyzerSnapshot.json`
- `ScalpLayer_Research_Summary.csv`
- Research Productivity section in Markdown export
- Productivity metadata in Analyzer Snapshot
- Responsive layout improvements

### Performance

- Reused existing analysis snapshots instead of adding a new analysis engine
- Kept active-tab rendering model
- Continued Virtual Table use for large tables
- Reduced Dashboard scroll by making high-priority controls visible first

### Not Changed

- No EA changes
- No CSV changes
- No CSV rewriting
- No trading-condition changes
- No auto optimization
- No auto trading
- No AI API calls
- No fake data generation
- No profit guarantee

## v6.0 Research Strategy Engine Edition

### Added

- `researchStrategyEngine.js`
- Research Strategy tab
- Priority Matrix
- Research ROI
- Research Cost
- Expected Research Value
- Research Risk
- Research Coverage
- Research Roadmap
- Quick Win
- Long Project
- Duplicate Research
- Missing Research
- Dependency Analyzer
- Blocker Detection
- Research HeatMap
- Research Strategy Summary
- Dashboard integration
- AI Research Brain integration
- Markdown integration
- Analyzer Snapshot integration
- Research History Snapshot summary fields

### Analyzer Snapshot Fields

- `researchStrategy`
- `priorityMatrix`
- `researchROI`
- `coverage`
- `roadmap`
- `quickWin`
- `longProject`
- `duplicateResearch`
- `missingResearch`
- `blockers`
- `strategySummary`

### Research History Snapshot Fields

- `averageResearchROI`
- `coveragePercent`
- `highestImpactResearch`
- `highestPriorityResearch`
- `blockerCount`
- `roadmapProgress`

### Not Changed

- No EA changes
- No CSV changes
- No CSV rewriting
- No trading-condition changes
- No auto optimization
- No auto trading
- No AI API calls
- No fake data generation
- No fake evidence generation
- No profit guarantee

Existing Dashboard, AI Research Report, Engine, Engine DNA, Condition, HeatMap, Session, NearMiss, Trade, Signal, CSV Manager, Research Data Quality, Cross CSV Intelligence, Research Intelligence, Research Manager, Research Board, Research Portfolio, Research Workspace, Research Hypothesis, Hypothesis Lineage, AI Research Brain, Knowledge Graph, Research Timeline, Performance Cache, Lazy Render, Virtual Table, Markdown, JSON, Research History, Engine Evolution, CSV Compatibility, and Research Workflow are retained.

## v5.3 Hypothesis Lineage & Evidence Weighting Edition

### Added

- `hypothesisLineageEngine.js`
- Hypothesis Lineage tab
- Hypothesis Relations
- Hypothesis Family
- Evidence Weight Settings
- Weighted Evidence Score
- Hypothesis Score 2.0
- Confidence Percent
- Validation Readiness
- Validation Checklist
- Hypothesis Compare
- Duplicate Detection
- Superseded Warning
- Orphan Hypothesis
- Hypothesis History
- Dashboard Lineage Summary
- AI Research Brain Lineage Summary
- Knowledge Graph hypothesis integration
- Timeline-compatible history events
- Markdown integration
- Analyzer Snapshot integration

### Analyzer Snapshot Fields

- `hypothesisLineage`
- `hypothesisRelations`
- `hypothesisFamilies`
- `hypothesisLineageSummary`
- `evidenceWeights`
- `weightedEvidenceSummary`
- `hypothesisScore2`
- `hypothesisConfidence2`
- `validationReadiness`
- `validationChecklist`
- `hypothesisHistory`
- `duplicateHypotheses`
- `orphanHypotheses`
- `supersededHypotheses`
- `hypothesisCompareSummary`

### localStorage Keys

- `scalplayerResearchHypothesis`
- `scalplayerHypothesisLineage`
- `scalplayerEvidenceWeights`
- `scalplayerHypothesisHistory`
- `scalplayerHypothesisReview`

### Not Changed

- No EA changes
- No CSV changes
- No CSV rewriting
- No trading-condition changes
- No auto optimization
- No auto operation
- No auto trading
- No AI API calls
- No fake data generation
- No fake evidence generation
- No profit guarantee

Existing Dashboard, AI Research Report, Engine, Engine DNA, Condition, HeatMap, Session, NearMiss, Trade, Signal, CSV Manager, Research Data Quality, Cross CSV Intelligence, Research Intelligence, Research Manager, Research Board, Research Portfolio, Research Workspace, Research Hypothesis, AI Research Brain, Knowledge Graph, Research Timeline, Performance Cache, Lazy Render, Virtual Table, Markdown, JSON, Research History, Engine Evolution, CSV Compatibility, and Research Workflow are retained.

## v5.2 Research Hypothesis Edition

### Added

- `researchHypothesisEngine.js`
- Research Hypothesis tab
- Hypothesis list
- Hypothesis Status:
  - Draft
  - Collecting Evidence
  - Testing
  - Verified
  - Rejected
  - Archived
- Evidence auto collection from:
  - Research Manager
  - NearMiss
  - Trade
  - Engine DNA
  - Knowledge Graph
  - Cross CSV
  - Timeline
  - Data Quality
- Confidence calculation
- Hypothesis Score out of 100
- Contradiction list
- Open Questions
- Research Flow
- Hypothesis Summary on Dashboard
- Hypothesis Summary in AI Research Brain
- Hypothesis section in `ResearchReport.md`
- Analyzer Snapshot fields:
  - `hypothesis`
  - `hypothesisSummary`
  - `evidenceSummary`
  - `contradictions`
  - `openQuestions`

### Design

- Hypothesis status is stored in localStorage.
- Evidence is collected from existing Analyzer data.
- No fake evidence is generated.
- Hypothesis Score is research guidance only, not a trading signal.

### Not Changed

- No EA code changes
- No CSV rewriting
- No trading-condition changes
- No auto optimization
- No AI API calls
- No fake data generation
- No profit guarantee
- Research Workspace, Knowledge Graph, Engine DNA, Timeline, Research Manager, Portfolio, Brain, Cross CSV, Data Quality, CSV Compatibility, Research Workflow, Performance Cache, Lazy Render, Virtual Table, Markdown, JSON, and Dashboard are retained.

## v5.1 Research Workspace Edition

### Added

- `researchWorkspaceEngine.js`
- Research Workspace tab
- Today's Focus Top3
- Research Queue
- Workspace Memo stored in localStorage
- Bookmark system stored in localStorage
- Pin system stored in localStorage
- Recent Activity stored in localStorage
- Workspace Dashboard
- Workspace Summary on Dashboard
- Workspace Summary in AI Research Brain
- Workspace Summary in `ResearchReport.md`
- Analyzer Snapshot fields:
  - `workspace`
  - `workspaceSummary`
  - `bookmark`
  - `pin`
  - `recentActivity`

### Activity Tracking

- CSV Load
- Research Added
- Decision
- Evidence
- Import
- Export
- Snapshot
- Bookmark Added / Removed
- Pin Added / Removed
- Memo Saved

### Design

- Workspace Memo is not included in Analyzer Snapshot.
- Bookmark and Pin are Workspace-only and do not create Research Manager items.
- Workspace data is saved in localStorage.
- Research Queue is generated from AI Research Brain, Research Manager, Knowledge Graph, Engine DNA, Cross CSV, and Timeline data.

### Not Changed

- No EA code changes
- No CSV rewriting
- No trading-condition changes
- No auto optimization
- No AI API calls
- No fake data generation
- No profit guarantee
- Dashboard, Timeline, Knowledge Graph, Engine DNA, Cross CSV, Research Manager, Research Board, Portfolio, AI Research Brain, Performance Cache, Lazy Render, Virtual Table, Markdown, JSON, CSV Compatibility, Research History, Engine Evolution, and Research Workflow are retained.

## v5.0 Research Knowledge Graph Edition

### Added

- `knowledgeGraphEngine.js`
- Knowledge Graph tab
- Engine Node, Condition Node, Session Node, TopNG Node, Research Node
- Engine Network
- Research Network
- Cluster Tree
- Opportunity Flow
- Session Flow
- TopNG Network
- Dependency Graph
- Bottleneck Graph
- Graph Statistics
- Knowledge Graph Summary on Dashboard
- Knowledge Graph Insight in AI Research Brain
- Knowledge Graph section in `ResearchReport.md`
- Analyzer Snapshot fields:
  - `knowledgeGraph`
  - `graphSummary`
  - `largestCluster`
  - `researchHub`
  - `topConnectedEngine`
  - `graphStatistics`
  - `dependencyGraph`

### Design

- Uses existing TradeHistory, NearMissHistory, EngineActivity, Signal Log, SessionResearch, ResearchHistory, and Research Manager data.
- No new CSV format is required.
- Public module API is `snapshot()`.
- Graph nodes and edges are generated from existing Analyzer results only.

### Not Changed

- No EA code changes
- No CSV rewriting
- No trading-condition changes
- No auto optimization
- No AI API calls
- No fake data generation
- No profit guarantee
- Engine DNA, Research Timeline, Cross CSV, Research Brain, Research Manager, Portfolio, Performance Cache, Lazy Render, Markdown, JSON, and CSV compatibility are retained.

## v4.5 Engine DNA & Pattern Discovery Edition

### Added

- `engineDnaEngine.js`
- Engine DNA tab
- DNA Profile per Engine
- Engine Personality classification
- Engine Similarity comparison
- Engine Cluster grouping
- Engine Strength / Weakness extraction
- Hidden Opportunity detection
- Engine Evolution from ResearchHistory snapshots
- Engine Stability stars
- Engine DNA Compare
- Top Engine DNA card on Dashboard
- Engine DNA Summary in AI Research Brain
- Engine DNA section in `ResearchReport.md`
- `engineDNA`, `engineCluster`, `engineSimilarity`, and `engineEvolution` fields in Analyzer snapshots

### Design

- Engine DNA is generated from loaded CSV and local ResearchHistory only.
- No AI API is used.
- No EA, CSV, or trading condition is modified.
- Existing Timeline, Cross CSV, Research Brain, Portfolio, Manager, Lazy Render, Snapshot Cache, Markdown, JSON, and CSV compatibility are retained.

### Not Changed

- No EA code changes
- No CSV rewriting
- No trading-condition changes
- No auto optimization
- No profit guarantee
- No AI API calls

## v4.4 Research Timeline & Trend Analysis Edition

### Added

- `trendEngine.js`
- Research Timeline & Trend Analysis enhancements
- Long Term Trend daily / weekly / monthly
- Trend Chart for Research Score, Correlation, Quality, and Confidence
- Improvement Analysis
- Best Snapshot
- Worst Snapshot
- Trend Forecast
- Milestones
- Timeline Events
- Trend Recommendation
- Research History Compare
- Trend Summary in AI Research Brain
- Research Trend summary on Dashboard
- Research Timeline section in `ResearchReport.md`
- Trend fields in Analyzer Snapshot

### Design

- Uses existing `ResearchHistory` and Research Manager data.
- Missing historical fields are treated as unavailable or zero.
- No fake snapshots are generated.
- No EA, CSV, or trading-condition changes.

### Not Changed

- No EA code changes
- No CSV rewriting
- No trading-condition changes
- No profit guarantee
- No AI API calls
- Cross CSV, Performance Cache, Research Brain, and Research Manager remain compatible.

## v4.3 Performance & Cache Edition

### Added

- Snapshot Cache
- Analysis Version
- Data Quality cache
- Cross CSV cache
- Brain cache
- Performance Monitor on Dashboard
- Performance Status in AI Research Brain
- Performance card in Cross CSV Intelligence
- Lazy Render by active tab
- Virtual Table for tables over 1000 rows
- `performanceUtil.js`
- Performance section in `ResearchReport.md`
- Performance fields in Analyzer Snapshot

### Design

- CSV parsing and analysis are still performed once per CSV load.
- Tab drawing is lazy-rendered only when the tab is active.
- Cached snapshots are invalidated only when CSV files are loaded or Analyzer is reset.
- Existing Research Recommendation, Opportunity Score, Correlation Score, and analysis algorithms are unchanged.

### Not Changed

- No EA code changes
- No CSV rewriting
- No trading-condition changes
- No Research Recommendation algorithm changes
- No Opportunity Score algorithm changes
- No Correlation Score algorithm changes
- No AI API calls

## v4.2 Cross CSV Intelligence Edition

### Added

- Cross CSV Intelligence tab
- `crossCsvEngine.js`
- Cross Summary
- Engine Correlation
- Session Correlation
- NearMiss Correlation
- Signal Correlation
- Opportunity Matrix
- Research Opportunity
- Correlation Score
- Cross Warning
- Cross Recommendation
- Cross CSV Insight in AI Research Brain
- Cross CSV Snapshot in Research Manager Analyzer Snapshot
- Cross CSV Intelligence section in `ResearchReport.md`

### Design

- CSV files are analyzed across relationships, not as isolated tables.
- Missing CSV files are skipped safely and shown as Cross Warning.
- Cross CSV recommendations are Research candidates, not trading-condition changes.

### Not Changed

- No EA code changes
- No CSV rewriting
- No trading-condition changes
- No profit guarantee
- No AI API calls

## v4.1 Research Data Quality & Confidence Edition

### Added

- Research Data Quality tab
- Overall Quality Score out of 100
- Confidence Score
- CSV Health Dashboard
- CSV Coverage Analysis
- Missing Data Analysis
- Duplicate Analysis
- Session Balance Analysis
- Engine Balance Analysis
- Time Coverage
- Freshness
- Warning Center
- Data Collection Recommendation
- Research Reliability percentage
- `dataQualityEngine.js`
- Data Quality section in Markdown report
- Data Quality snapshot in Research Manager Analyzer Snapshot

### Design

- Analyzer evaluates whether CSV is reliable enough for Research.
- No missing data is invented.
- No CSV file is rewritten.
- No EA code is changed.

### Not Changed

- No EA code changes
- No CSV rewriting
- No trading-condition changes
- No profit guarantee
- No AI API calls

## v4.0.1 CSV Compatibility & Schema Stabilization Edition

### Fixed

- Integrated Signal Log `rule -> Engine` compatibility
- CoreRuleE Signal Log file detection
- Header-based CSV detection
- Empty CSV handling for recognized CSV types
- Canonical schema validation after alias normalization
- Column alias normalization
- CSV Manager detection detail
- Unknown CSV safe skip visibility

### Added

- `CSV_SCHEMA_VERSION = "4.0.1"`
- `CSV_COLUMN_ALIASES`
- `normalizeCsvHeaders(headers)`
- `normalizeCsvRow(row, csvType)`
- `resolveAlias(row, canonicalName)`
- Detection method display in CSV Manager
- Alias applied display in CSV Manager
- `CSV_COMPATIBILITY_TEST.md`

### Not Changed

- No EA code changes
- No CSV rewriting
- No trading-condition changes
- No profit calculation changes
- No missing Engine names invented
- No new AI API calls

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
