# ScalpLayer Analyzer v2.0

Research Intelligence Edition は、ScalpLayer Integrated EA が出力したCSVをまとめて解析する研究支援ツールです。

これはEAではありません。  
発注、決済、売買条件の変更、CSVの書き換えは行いません。

目的は、CSVから以下を可視化することです。

- 現在のEAがどのEngineで動いているか
- なぜエントリーしないのか
- どの条件がNearMissの原因になっているか
- どのEngineを次回Researchで優先すべきか
- Researchの推移が改善しているか

## 作成ファイル

| ファイル | 内容 |
|---|---|
| `index.html` | Analyzer本体 |
| `style.css` | ダークテーマUI |
| `script.js` | 画面描画と操作 |
| `analysisEngine.js` | CSV解析・Research Intelligence |
| `ResearchHistory.json` | 履歴ファイルの初期雛形 |
| `README.md` | この説明書 |
| `CHANGELOG.md` | 更新履歴 |
| `CSV_SPECIFICATION.md` | 対応CSV仕様 |

## 使い方

1. `index.html` をブラウザで開きます。
2. 左側の「CSVを読み込む」から、EAが出力したCSVを複数選択します。
3. 存在しないCSVは自動でスキップされます。
4. 各タブで分析結果を確認します。

対応CSV:

- `TradeHistory.csv`
- `NearMissHistory.csv`
- `EngineActivity.csv`
- `EngineActivity_v2.csv`
- `EngineRuntime.csv`
- `SessionResearch.csv`
- `ScalpLayer_Integrated_signal_log.csv`

## タブ構成

### Dashboard

EA全体の健康状態を確認します。

- 総トレード数
- 勝率
- ProfitFactor
- 総利益
- 期待値
- 最大DD
- Engine別利益
- 今日のResearch候補

### Engine

EngineActivity CSVを解析します。

- Checks
- TimeOK
- FullSignal
- Entries
- EntryRate
- TopNG
- Engine Health
- Engine Radar

### Session

東京、ロンドン、NY、Otherの時間帯別に分析します。

- Trades
- NearMiss
- WinRate
- AveragePips
- TopNG
- Research Score

### NearMiss

エントリー直前で止まった候補を分析します。

- あと1条件
- あと2条件
- あと3条件以上
- NG条件ランキング
- NG条件組み合わせランキング
- 一番惜しいEngine

### Trade

実際に約定・決済された履歴を分析します。

- Engine別勝率
- Engine別利益
- 平均Pips
- 平均保有時間
- 連勝
- 連敗

### Signal

Signalログを解析します。

- Signal数
- Engine別Signal
- SignalからEntryまでの成功率

### CSV Manager

読み込んだCSVの状態を確認します。

- 存在
- 件数
- 列数
- 更新日時
- 対応Version
- CSVの用途

### Research Intelligence

Analyzer v2.0の中心機能です。

CSVから次回Research候補を自動生成します。

重要なのは、ここで表示される内容は「条件変更の指示」ではないことです。  
あくまで「次に検証すべきResearch候補」です。

例:

- RSI閾値研究
- ATR条件研究
- Volume条件研究
- NearMiss組み合わせ研究
- Session NearMiss研究

### Research Timeline

Analyzerを実行するたびに、ブラウザのlocalStorageへ履歴を保存します。

表示項目:

- Trade数
- NearMiss数
- WinRate
- ProfitFactor
- Engine Evolution
- Research Memo

`履歴JSON` ボタンから `ResearchHistory.json` としてダウンロードできます。

## Research Score

Research Score は以下の観点からルールベースで算出します。

- 件数
- 勝率
- 平均Pips
- EntryRate
- NearMiss
- TopNG
- 再現性の見込み

表示:

- ★★★★★ 最優先Research候補
- ★★★★☆ 優先Research候補
- ★★★☆☆ 参考候補
- ★★☆☆☆ 低優先度
- ★☆☆☆☆ データ不足

件数が少ない場合は、勝率が高くても高評価になりすぎないようにしています。

## Research Philosophy

ScalpLayer Projectは、勝てるEAをAIへ丸投げするプロジェクトではありません。

Build  
Research  
Debug  
Validate  
Improve  
Optimize  
Repeat

このサイクルを繰り返し、リアル運用データから再現性の高い条件を発見するAI Research Projectです。

## 注意

- このツールはCSV解析専用です。
- EAを書き換える機能はありません。
- 売買条件の変更提案は行いません。
- 利益を保証するものではありません。
- Chart.jsをCDNから読み込むため、グラフ表示にはインターネット接続が必要です。

## 将来拡張

`analysisEngine.js` に `AnalysisEngine` クラスを分離しています。

将来、以下のAPIに接続してAIコメントを生成できる設計です。

- OpenAI
- Claude
- Groq
- Gemini

v2.0では外部AI APIには接続していません。
