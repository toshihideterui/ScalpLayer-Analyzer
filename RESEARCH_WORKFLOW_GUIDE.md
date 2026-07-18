# Research Workflow Guide v3.2

## Overview

ScalpLayer Research Lab v3.2では、CSV分析からResearch候補の管理までを一つの流れで扱えます。

基本の流れは以下です。

```text
CSV Load
  ↓
Dashboard確認
  ↓
Research Intelligence確認
  ↓
Research Managerへ登録
  ↓
仮説を整理
  ↓
必要データを集める
  ↓
検証
  ↓
Evidence追加
  ↓
Decision
  ↓
次Researchへ
```

## 1. CSVを読み込む

以下のCSVをまとめてドラッグ&ドロップします。

- TradeHistory.csv
- NearMissHistory.csv
- EngineActivity.csv
- EngineActivity_v2.csv
- EngineRuntime.csv
- SessionResearch.csv
- ScalpLayer_Integrated_signal_log.csv

存在しないCSVはスキップされます。

## 2. Research Intelligenceを見る

Research Intelligenceは、次に調べる価値が高い候補を表示します。

見るべきポイント:

- Research Score
- Confidence
- Engine
- Session
- TopNG
- NearMiss
- Single Bottleneck

## 3. Research Managerへ登録する

候補カードの `Add to Research Manager` を押すと、Research Itemが作成されます。

作成時には、Analyzerの状態が `sourceAnalyzerSnapshot` として保存されます。これにより、なぜその候補を登録したのかを後から確認できます。

## 4. 仮説を書く

良い仮説の例:

```text
Morning PrimeはTimeOKが十分あるが、ATRとVolumeで止まっている。
条件変更ではなく、まずATR/Volumeの分布と勝敗の関係を確認する。
```

悪い仮説の例:

```text
ATR条件を緩めれば勝てそう。
```

条件変更を急がず、まず検証可能な疑問として書くのがポイントです。

## 5. 検証計画を書く

検証計画には、比較方法を具体的に書きます。

例:

- NearMissをEngine別に比較する
- Session別にTopNGを比較する
- TradeHistoryで勝ちトレードと負けトレードのATR分布を比較する
- 件数不足なら最低100件まで保留する

## 6. Research Boardで進捗管理

Research Boardでは、以下のように進めます。

```text
Backlog
  ↓
Hypothesis
  ↓
Ready
  ↓
Collecting Data
  ↓
Testing
  ↓
Review
  ↓
Completed
```

## 7. Evidenceを残す

Evidenceには、判断材料を短く残します。

例:

- 2026-07-18時点でNearMiss 82件
- RSIのみNGが最も多い
- Trade数が5件未満なのでConfidenceは不足
- 1週間後に再集計

## 8. Decisionを付ける

Decisionは以下から選びます。

- Adopt
- Reject
- Hold
- Need More Data
- Revalidate

`Adopt` はEAへ自動反映する意味ではありません。Researchとして採用し、別途EA実装判断を行うという意味です。

## 9. Portfolioで全体を見る

Research Portfolioでは以下を確認します。

- Total
- Adopted
- Rejected
- On Hold
- Stale
- Critical
- Priority Matrix
- Next Research Recommendation

Staleが増えている場合は、Research候補を増やすより先に未完了項目を整理してください。

## 10. 推奨運用

毎日:

- CSVを読み込む
- Dashboardを見る
- Research Intelligenceを見る
- Memoを書く

週1回:

- Research Managerを整理する
- Evidenceを追記する
- Completed / Hold / Revalidateを判断する

Research前:

- `ScalpLayer_Research_Manager.json` をエクスポートする
- 必要なら個別Research Markdownを保存する

## Philosophy

ScalpLayer Projectは、AIに答えを出させるプロジェクトではありません。

AIと一緒に、観察し、仮説を立て、検証し、改善するためのResearch Projectです。

Build  
Research  
Debug  
Validate  
Improve  
Optimize  
Repeat
