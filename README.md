# ScalpLayer Research Lab v4.0

ScalpLayer Research Lab は、ScalpLayer Integrated EA が出力したCSVを読み込み、EAの状態、Research候補、Research全体の進捗を整理するための研究支援ツールです。

これはEAではありません。売買条件を書き換えません。CSVも書き換えません。目的は、リアルトレードやNearMissの記録から「次に何を研究すべきか」を見える化することです。

## v4.0 の位置づけ

v4.0 AI Research Brain Edition では、AnalyzerとResearch Managerの上に、Research全体を俯瞰するAI Research Brainを追加しました。

```text
Analyzer
  ↓
Research Manager
  ↓
AI Research Brain
```

AnalyzerはCSVを読みます。  
Research Managerは研究を管理します。  
AI Research Brainは研究全体を俯瞰し、「今日どのResearchに取り組むべきか」を提案します。

AI APIは使用しません。ルールベースのResearch Advisorです。

## 主な機能

- Dashboard
- AI Research Report
- Engine Analysis
- Condition Intelligence
- HeatMap
- Session Analysis
- NearMiss Analysis
- Trade Analysis
- Signal Analysis
- CSV Manager
- Research Intelligence
- Research Manager
- Research Board
- Research Portfolio
- AI Research Brain
- Research Timeline
- Research Memo

## AI Research Brain

AI Research Brainは、研究全体を俯瞰するための画面です。

表示内容:

- Research Overview
- Today's Research Top5
- Research Priority Ranking
- Research Bottleneck
- Required Data Forecast
- Research Roadmap
- Research Timeline 2.0
- Research Quality Statistics
- Research Risk
- Knowledge Base
- Research Cluster
- Research Insight
- Weekly / Monthly Summary

重要: Brainの提案はResearch候補です。EAの売買条件を直接変更する指示ではありません。

## v4.0で追加したファイル

- `recommendationEngine.js`
- `knowledgeEngine.js`
- `brainEngine.js`
- `AI_RESEARCH_BRAIN_SPECIFICATION.md`

## Research Manager

Research Managerは、次回Research候補を管理するためのタスクボードです。

管理できる項目:

- title
- category
- status
- priority
- researchScore
- confidence
- engine
- condition
- session
- hypothesis
- reason
- requiredData
- validationPlan
- successCriteria
- failureCriteria
- evidence
- decision
- decisionLog
- history
- nextAction
- sourceAnalyzerSnapshot

`Adopt` は「EAへ即反映する」という意味ではありません。Researchとして採用する、という意味です。EAコードの変更は別工程で必ず再確認してください。

## 使い方

1. `index.html` をブラウザで開きます。
2. EAが出力したCSVをドラッグ&ドロップします。
3. DashboardとResearch Intelligenceを確認します。
4. 気になる候補の `Add to Research Manager` を押します。
5. Research Managerで仮説と検証計画を確認します。
6. Research Boardで進捗を管理します。
7. Research Portfolioで滞留・優先度・次に着手すべき候補を確認します。
8. AI Research Brainで、今日取り組むべきResearchを確認します。

## 対応CSV

- `TradeHistory.csv`
- `NearMissHistory.csv`
- `EngineActivity.csv`
- `EngineActivity_v2.csv`
- `EngineRuntime.csv`
- `SessionResearch.csv`
- `ScalpLayer_Integrated_signal_log.csv`

存在しないCSVは自動スキップします。

## Cloudflare Workers / Pagesへアップロードするファイル

最低限、以下を同じ階層へアップロードしてください。

- `index.html`
- `style.css`
- `script.js`
- `analysisEngine.js`
- `researchTemplates.js`
- `researchStorage.js`
- `researchManager.js`
- `recommendationEngine.js`
- `knowledgeEngine.js`
- `brainEngine.js`

ドキュメントも一緒に配布する場合:

- `README.md`
- `CHANGELOG.md`
- `CSV_SPECIFICATION.md`
- `RESEARCH_SCORE_SPECIFICATION.md`
- `RESEARCH_MANAGER_SPECIFICATION.md`
- `RESEARCH_WORKFLOW_GUIDE.md`
- `RESEARCH_MANAGER_RELIABILITY_TEST.md`
- `AI_RESEARCH_BRAIN_SPECIFICATION.md`

## ScalpLayer Projectの思想

ScalpLayer Projectは、AIに「勝てるEAを作らせる」ためのものではありません。

Build  
Research  
Debug  
Validate  
Improve  
Optimize  
Repeat

このサイクルを回し、リアルな記録から再現性の高い条件を探していくためのAI Research Projectです。

## 禁止事項

- AnalyzerからEAコードを自動変更しない
- AnalyzerからCSVを書き換えない
- AI Research Brainの提案を売買条件変更として扱わない
- 勝率や利益を保証する表現をしない
- Research Scoreを利益予測として扱わない
- AI APIが判断しているように見せない

## ファイル構成

```text
index.html
style.css
script.js
analysisEngine.js
researchTemplates.js
researchStorage.js
researchManager.js
recommendationEngine.js
knowledgeEngine.js
brainEngine.js
README.md
CHANGELOG.md
CSV_SPECIFICATION.md
RESEARCH_SCORE_SPECIFICATION.md
RESEARCH_MANAGER_SPECIFICATION.md
RESEARCH_WORKFLOW_GUIDE.md
AI_RESEARCH_BRAIN_SPECIFICATION.md
ResearchHistory.json
```

## 推奨運用

毎日、EAが出力したCSVを読み込みます。

まずは数字を眺めるだけで十分です。すぐに条件を緩めるのではなく、NearMiss、TopNG、Session、Engine Health、Research BrainのRiskとBottleneckを見て、どこに研究価値があるかを確認してください。

最低でも1〜2週間のログを集めてから、Research Managerで仮説を立て、次のResearchへ進むのがおすすめです。
