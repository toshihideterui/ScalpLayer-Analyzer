# ScalpLayer Research Lab v3.1

Stabilization & Deep Research Edition は、v3.0の機能を壊さず、分析の信頼性とResearch判断の精度を高めた品質改善版です。

これはEAではありません。  
EAを書き換えません。CSVを書き換えません。売買条件の変更指示も行いません。

目的は、毎日のCSVから以下を可視化することです。

- EA健康診断
- Engine健康診断
- NearMiss解析
- TopNG解析
- Condition解析
- Session解析
- Research Report
- Research順位
- 次回Research候補

## v3.1 の主な改善

- DOM安全化: UI要素が存在しない場合もAnalyzer全体が停止しにくくなりました。
- CSV検証: CSV ManagerにValidationとWarningsを追加しました。
- 重複CSV対応: 同じCSV種別を読み込んだ場合は最新ファイルで置き換えます。
- Research Score 3.0: 勝率ではなく「次に研究する価値」を評価する設計へ改善しました。
- Score内訳表示: Data Volume、NearMiss、Clear Bottleneck、Trade Evidenceなどを表示します。
- Confidence表示: High / Medium / Low / InsufficientをEngineごとに表示します。
- NearMiss Deep Analysis: Engine別・Session別・Single Bottleneckを表示します。
- Condition State Pattern: CSVから取得可能な範囲で成立/不成立パターンを集計します。
- Holding Analysis / Spread Analysisを追加しました。
- Session Condition Matrixを追加しました。
- ResearchHistoryの重複保存を防止するfingerprintを追加しました。
- Markdown Reportを強化しました。

## 重要

v3.1は新しい売買条件を作るバージョンではありません。  
Analyzerの分析精度と信頼性を上げる品質改善版です。

以下は禁止しています。

- EAを書き換えること
- CSVを書き換えること
- 売買条件を直接変更すること
- Research Scoreを利益予測として扱うこと
- データに存在しない情報を推測すること

## 主な機能

### AI Research Report 2.0

CSV検証結果、Engine状態、前回との差分、NearMiss単独NG、Condition State Pattern、Session候補を含めたレポートを生成します。

### Engine Medical Chart

各Engineを健康診断カードとして表示します。

- Health
- Research Score
- Trade数
- NearMiss
- TimeOK
- EntryRate
- TopNG

### Condition Intelligence

以下の条件ごとにResearch候補を整理します。

- RSI
- ATR
- BB
- Volume
- Spread
- Time
- RecentDrop
- RecentRise
- LowUpdate
- HighUpdate
- BearStreak
- BullStreak

### TopNG HeatMap

Engine × NG条件 のヒートマップを表示します。  
色が濃いほどNGが多いことを示します。

### Session HeatMap

Tokyo / London / NY / Other のTrade、NearMiss、WinRate、ResearchScoreを比較します。

### Research Progress

現在のCSV分析状況をゲージで表示します。

### Research Score 2.0

v3.1では Research Score 3.0 として改善しました。

以下の要素から研究優先度を算出します。

- Trade数
- WinRate
- ProfitFactor
- AverageWin
- AverageLoss
- Holding
- NearMiss
- TopNG
- Session
- Spread
- EntryRate
- TimeOK
- FullSignal
- Engine Health

Research Scoreは「勝てる可能性」ではなく「次に研究する価値」です。

### Confidence

Research Scoreとは別に、データ量と証拠量から信頼度を表示します。

- High
- Medium
- Low
- Insufficient

### AI Prompt Builder

ChatGPTへ渡す分析依頼文を自動生成します。  
Trade、NearMiss、TopNG、Session、Condition、Research Reportを含みます。

### Research Export

`ResearchReport.md` をブラウザからダウンロードできます。

出力内容:

- Dataset Summary
- CSV Validation
- Overall Performance
- Engine Medical Chart
- Engine Evolution
- NearMiss Deep Analysis
- Single Bottleneck Research
- Condition State Patterns
- Session Condition Matrix
- Holding Analysis
- Spread Analysis
- Research Candidates
- Data Confidence
- Research Memo
- Next Data Collection

### Future AI

`analysisEngine.js` に `AIAnalysisEngine` クラスを追加しました。  
将来、OpenAI / Claude / Groq / Gemini と接続するための空クラスです。v3.0では外部APIを使用しません。

## 対応CSV

- `TradeHistory.csv`
- `NearMissHistory.csv`
- `EngineActivity.csv`
- `EngineActivity_v2.csv`
- `EngineRuntime.csv`
- `SessionResearch.csv`
- `ScalpLayer_Integrated_signal_log.csv`

存在しないCSVは自動スキップします。

## 使い方

1. `index.html` を開きます。
2. 左側の `Load CSV Files` からCSVを複数選択します。
3. Dashboardで全体状態を確認します。
4. AI Research Reportで今日の研究要約を確認します。
5. Research Intelligenceで次回Research候補を確認します。
6. 必要に応じて `ResearchReport.md` を出力します。

## 重要な考え方

Analyzerが表示するのは、条件変更の指示ではありません。

表示するのは、あくまで

**Research候補**

です。

条件をすぐ緩めるのではなく、まずデータを集め、NearMiss、TopNG、Session、Conditionを確認してから次のResearchへ進みます。

## Research Philosophy

Build  
Research  
Debug  
Validate  
Improve  
Optimize  
Repeat

ScalpLayer Projectは、AIに勝てるEAを丸投げするプロジェクトではありません。  
AIと一緒に研究を進め、リアルデータから再現性のある条件を探すAI Research Projectです。
