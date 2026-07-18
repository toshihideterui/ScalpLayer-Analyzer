# Research Score 3.0 Specification

Research Score 3.0 は、勝率予測や利益予測ではありません。

目的は、

**次にResearchする価値が高い対象を見つけること**

です。

## 評価対象

Engine単位では以下を見ます。

- Trade数
- WinRate
- ProfitFactor
- TotalPips
- AveragePips
- AverageWin
- AverageLoss
- MaxWinStreak
- MaxLossStreak
- AverageHolding
- NearMiss数
- あと1条件NearMiss数
- あと2条件NearMiss数
- TimeOK
- FullSignal
- EntryRate
- TopNG件数
- Session分布
- Spread分布
- データ量

## Score内訳

現在の実装では、Engineカードに以下の内訳を表示します。

| 項目 | 意味 |
|---|---|
| Data Volume | Check数やTrade数が十分あるか |
| NearMiss / TopNG | 研究対象となるNearMissやTopNGが存在するか |
| Clear Bottleneck | ボトルネック条件が明確か |
| Trade Evidence | 実Tradeの証拠があるか |
| Session Potential | TimeOKが十分あるか |
| Confidence Penalty | データ不足による減点 |

## Confidenceとの違い

Research Score:

- 次に研究する価値
- NearMissが多い対象も高評価になる
- Tradeが少なくても、TimeOKやTopNGが明確なら高くなることがある

Confidence:

- その分析結果をどの程度信頼できるか
- データ量、Trade数、Check数、TimeOK、TopNG件数で判定する

## Confidence

| 表示 | 意味 |
|---|---|
| High | 十分なデータがある |
| Medium | ある程度の判断が可能 |
| Low | 研究価値はあるがデータ不足 |
| Insufficient | まだ判断材料が少ない |

## 比較時の注意

前回と今回でCheckCountやCSV期間が大きく違う場合、単純比較は危険です。

v3.1では、以下のような正規化指標を優先します。

- NearMiss per 1,000 Checks
- Entries per 1,000 TimeOK
- FullSignal Rate
- Entry Conversion Rate

## 禁止事項

- Research Scoreを勝率予測として扱わない
- Research Scoreを利益予測として扱わない
- データに存在しない条件順序を推測しない
- Scoreが高いだけでEA条件を変更しない

Research Scoreは、あくまでResearch vNextの優先順位を作るための指標です。
