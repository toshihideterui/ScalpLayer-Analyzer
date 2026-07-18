# Research Manager Specification v3.2

## Purpose

Research Managerは、ScalpLayer Research Labが生成したResearch候補を、検証可能な研究タスクとして管理するための機能です。

Analyzerは売買条件を変更しません。Research ManagerもEAやCSVを書き換えません。目的は、仮説、検証計画、必要データ、証拠、判定を一つの流れで管理することです。

## Storage

ブラウザのlocalStorageを使用します。

| Key | Purpose |
| --- | --- |
| `scalplayerResearchItems` | Research Item本体 |
| `scalplayerResearchSettings` | Research Manager設定 |
| `scalplayerResearchManagerHistory` | Manager操作履歴 |
| `scalplayerResearchHistory` | Analyzer実行履歴 |
| `scalplayerResearchMemo` | Research Memo |

## Research Item Schema

| Field | Description |
| --- | --- |
| `id` | Research Item ID |
| `title` | Researchタイトル |
| `category` | Researchカテゴリ |
| `status` | Workflow状態 |
| `priority` | 優先度 |
| `researchScore` | Analyzer由来の研究スコア |
| `confidence` | データ信頼度 |
| `engine` | 対象Engine |
| `condition` | 対象条件 |
| `session` | 対象Session |
| `hypothesis` | 仮説 |
| `reason` | Research候補になった理由 |
| `requiredData` | 必要CSVや必要期間 |
| `validationPlan` | 検証計画 |
| `successCriteria` | 成功条件 |
| `failureCriteria` | 失敗条件 |
| `datasetStart` | 対象データ開始 |
| `datasetEnd` | 対象データ終了 |
| `createdAt` | 作成日時 |
| `updatedAt` | 更新日時 |
| `startedAt` | 着手日時 |
| `completedAt` | 完了日時 |
| `decision` | 判定 |
| `resultSummary` | 結果まとめ |
| `evidence` | 証拠メモ |
| `nextAction` | 次の行動 |
| `tags` | タグ |
| `sourceAnalyzerSnapshot` | 作成時のAnalyzer状態 |

## Categories

- Engine Research
- Condition Research
- Session Research
- NearMiss Research
- Single Bottleneck Research
- Holding Research
- Spread Research
- Data Quality Research
- Combination Research
- Other

## Status

- Backlog
- Hypothesis
- Ready
- Collecting Data
- Testing
- Review
- Completed
- On Hold
- Rejected
- Adopted
- Revalidation

## Decision

- Undecided
- Adopt
- Reject
- Hold
- Need More Data
- Revalidate

`Adopt` はEAへ自動反映する意味ではありません。Researchとして採用し、別工程でEA実装を検討するという意味です。

## Priority

- Critical
- High
- Medium
- Low

## Templates

`researchTemplates.js` に以下のテンプレートを定義しています。

- Engine Bottleneck
- Single Condition Bottleneck
- Session Difference
- NearMiss Combination
- Holding Time
- Spread Environment
- Data Quality
- Blank

## Export / Import

Research ManagerはJSON形式でエクスポートできます。

Export file:

```text
ScalpLayer_Research_Manager.json
```

Markdown export:

```text
Research_<title>.md
```

## Important Notes

- EAコードは変更しません。
- CSVは変更しません。
- Research候補は売買条件変更の指示ではありません。
- 条件を緩める前に、最低1〜2週間のログで再確認してください。
