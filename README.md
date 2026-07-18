# ScalpLayer Research Lab v3.2

ScalpLayer Research Lab は、ScalpLayer Integrated EA が出力したCSVを読み込み、EAの状態と次回Research候補を整理するための研究支援ツールです。

これはEAではありません。売買条件を書き換えません。CSVも書き換えません。目的は、リアルトレードやNearMissの記録から「次に何を研究すべきか」を見える化することです。

## v3.2 の位置づけ

v3.2 Research Workflow & AI Research Manager Edition では、Analyzerが出したResearch候補を、その場で研究タスクとして管理できるようになりました。

これまでのAnalyzerは、CSVを読み込んで候補を表示するところまででした。v3.2では、候補をResearch Managerに登録し、仮説、検証計画、必要データ、証拠、判定まで追跡できます。

## 主な機能

- Dashboard
- Engine Analysis
- Session Analysis
- NearMiss Analysis
- Trade Analysis
- Signal Analysis
- CSV Manager
- Research Intelligence
- Research Timeline
- Research Memo
- Research Manager
- Research Board
- Research Portfolio

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
- validationPlan
- successCriteria
- failureCriteria
- evidence
- decision
- nextAction
- sourceAnalyzerSnapshot

重要: `Adopt` は「EAへ即反映する」という意味ではありません。Researchとして採用する、という意味です。EAコードの変更は別工程で必ず再確認してください。

## 使い方

1. `index.html` をブラウザで開きます。
2. EAが出力したCSVをドラッグ&ドロップします。
3. DashboardとResearch Intelligenceを確認します。
4. 気になる候補の `Add to Research Manager` を押します。
5. Research Managerで仮説と検証計画を確認します。
6. Research Boardで進捗を管理します。
7. Research Portfolioで滞留・優先度・次に着手すべき候補を確認します。

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

ドキュメントも一緒に配布する場合:

- `README.md`
- `CHANGELOG.md`
- `CSV_SPECIFICATION.md`
- `RESEARCH_SCORE_SPECIFICATION.md`
- `RESEARCH_MANAGER_SPECIFICATION.md`
- `RESEARCH_WORKFLOW_GUIDE.md`

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
- 勝率や利益を保証する表現をしない
- Research候補をそのまま売買条件変更として扱わない

## ファイル構成

```text
index.html
style.css
script.js
analysisEngine.js
researchTemplates.js
researchStorage.js
researchManager.js
README.md
CHANGELOG.md
CSV_SPECIFICATION.md
RESEARCH_SCORE_SPECIFICATION.md
RESEARCH_MANAGER_SPECIFICATION.md
RESEARCH_WORKFLOW_GUIDE.md
ResearchHistory.json
```

## 推奨運用

毎日、EAが出力したCSVを読み込みます。

まずは数字を眺めるだけで十分です。すぐに条件を緩めるのではなく、NearMiss、TopNG、Session、Engine Healthを見て、どこに研究価値があるかを確認してください。

最低でも1〜2週間のログを集めてから、Research Managerで仮説を立て、次のResearchへ進むのがおすすめです。
