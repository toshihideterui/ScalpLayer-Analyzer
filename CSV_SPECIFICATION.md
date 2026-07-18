# CSV Specification

ScalpLayer Analyzer v2.0 が対応するCSV仕様です。

存在しないCSVは自動でスキップされます。  
列名の一部が異なる場合でも、可能な範囲で自動認識します。

## 対応CSV一覧

| CSV | Version | 用途 | 更新タイミング | 使用画面 |
|---|---:|---|---|---|
| `TradeHistory.csv` | v1 | 実際の約定・決済履歴 | 決済成功時 | Dashboard / Trade / Intelligence |
| `NearMissHistory.csv` | v1 | FullSignal直前で不成立だった履歴 | NearMiss発生時 | NearMiss / Intelligence |
| `EngineActivity.csv` | v1 | Engine別の活動統計 | 定期出力 / 終了時 | Engine / Intelligence |
| `EngineActivity_v2.csv` | v2 | Engine別の活動統計。EntryRate対応 | 定期出力 / 終了時 | Engine / Intelligence |
| `EngineRuntime.csv` | v1 | EngineのACTIVE / WAIT履歴 | Engine状態変化時 | CSV Manager |
| `SessionResearch.csv` | v1 | Session別・Engine別の条件成立統計 | 定期出力 / 終了時 | Session / Intelligence |
| `ScalpLayer_Integrated_signal_log.csv` | v1 | Signal発生履歴 | Signal検出時 | Signal |

## TradeHistory.csv

### 用途

実際に約定し、決済されたトレード履歴です。

### 主な列

| 列 | 内容 |
|---|---|
| Date | 日付 |
| Time | 時刻 |
| Engine | Engine名 |
| BUYSELL / Side / Direction | BUYまたはSELL |
| Entry | エントリー価格 |
| Exit | 決済価格 |
| Pips | 損益pips |
| Profit | 損益金額 |
| HoldingMinutes | 保有時間 |
| ATR | ATR |
| RSI | RSI |
| Spread | スプレッド |
| Volume | 出来高またはVolumeRatio |
| BB | BB位置 |
| Session | Tokyo / London / NY / Other |

## NearMissHistory.csv

### 用途

FullSignalにはならなかったが、あと少しで成立した候補を記録します。

### 主な列

| 列 | 内容 |
|---|---|
| Date | 日付 |
| Time | 時刻 |
| Session | Session |
| Engine | Engine名 |
| Direction | BUYまたはSELL |
| OKCount | OK条件数 |
| NGCount | NG条件数 |
| NGReasons | NG理由 |
| RSI | RSI |
| ATR | ATR |
| Spread | Spread |
| BB | BB位置 |
| RecentDrop | 直近下落 |
| RecentRise | 直近上昇 |
| Volume | Volume |
| Price | 価格 |

## EngineActivity.csv / EngineActivity_v2.csv

### 用途

Engineが判定されているか、どの条件で止まっているかを確認します。

### 主な列

| 列 | 内容 |
|---|---|
| Date | 日付 |
| Time | 時刻 |
| Engine | Engine名 |
| Enabled | 有効状態 |
| TimeWindowEnterCount | 時間帯に入った回数 |
| CheckCount | 判定回数 |
| TimeOKCount | 時間条件OK回数 |
| FullSignalTrueCount | FullSignal成立回数 |
| FullSignalFalseCount | FullSignal不成立回数 |
| OrderAttemptCount | 発注試行回数 |
| OrderSuccessCount | 発注成功回数 |
| OrderFailedCount | 発注失敗回数 |
| PositionOpenedCount | ポジション成立回数 |
| PositionClosedCount | 決済完了回数 |
| EntryRate | TimeOKに対するEntry率 |
| TopNG1 / TopNG2 / TopNG3 | 主なNG理由 |

## EngineRuntime.csv

### 用途

各EngineがACTIVEかWAITかを確認します。

### 主な列

| 列 | 内容 |
|---|---|
| Date | 日付 |
| Time | 時刻 |
| Session | Session |
| Engine | Engine名 |
| Status | ACTIVE / WAIT |

## SessionResearch.csv

### 用途

時間帯ごとに条件成立率とNearMiss傾向を確認します。

### 主な列

| 列 | 内容 |
|---|---|
| Date | 日付 |
| Session | Tokyo / London / NY / Other |
| Engine | Engine名 |
| Bars | 判定バー数 |
| FullSignalTrue | FullSignal成立回数 |
| Entries | Entry回数 |
| NearMiss | NearMiss回数 |
| RSI_OK | RSI条件OK回数 |
| RecentDrop_OK | RecentDrop OK回数 |
| RecentRise_OK | RecentRise OK回数 |
| BB_OK | BB OK回数 |
| ATR_OK | ATR OK回数 |
| Vol_OK | Volume OK回数 |
| Time_OK | Time OK回数 |
| Spread_OK | Spread OK回数 |
| TopNG1 / TopNG2 / TopNG3 | 主なNG理由 |

## ScalpLayer_Integrated_signal_log.csv

### 用途

Signal発生数とEntry成功率を確認します。

### 主な列

| 列 | 内容 |
|---|---|
| Date | 日付 |
| Time | 時刻 |
| Engine | Engine名 |
| Direction | BUYまたはSELL |
| Signal | Signal内容 |
| Result | 結果 |

## 今後CSVが増える場合

新しいCSVを追加する場合は、以下を決めてください。

1. CSV名
2. 更新タイミング
3. 主な列
4. どの画面で使うか
5. Version
