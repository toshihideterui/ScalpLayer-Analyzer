# ScalpLayer Research Lab v3.0

AI Research Lab Edition は、ScalpLayer Integrated EA が出力したCSVを分析し、次回Research候補を自動整理する研究支援ツールです。

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

## v3.0 の主な機能

### AI Research Report

Analyzer実行後に、ルールベースで研究レポートを自動生成します。  
AI APIは使用しません。

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

### AI Prompt Builder

ChatGPTへ渡す分析依頼文を自動生成します。  
Trade、NearMiss、TopNG、Session、Condition、Research Reportを含みます。

### Research Export

`ResearchReport.md` をブラウザからダウンロードできます。

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
