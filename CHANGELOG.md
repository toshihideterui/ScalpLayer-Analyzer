# CHANGELOG

## v2.0 Research Intelligence Edition

### Added

- Research Intelligence タブを追加
- Research Timeline タブを追加
- Research Score `★★★★★` 表示を追加
- Engine Health を追加
  - Excellent
  - Good
  - Stable
  - Needs Research
  - Inactive
- Engine Radar チャートを追加
- Session Intelligence を追加
- NearMissを以下に分類
  - あと1条件
  - あと2条件
  - あと3条件以上
- NearMissボトルネック組み合わせランキングを追加
- Research候補の自動生成を追加
- Research Memo を追加
- ResearchHistoryをlocalStorageへ保存
- ResearchHistory.jsonダウンロード機能を追加
- `analysisEngine.js` を追加し、解析ロジックを分離
- CSV Managerに対応Version表示を追加

### Changed

- 文字化けしていた日本語UIを修正
- タブ構成をv2.0用に再整理
- Development SuggestionsをResearch Intelligenceへ発展
- UIをResearch Command Centerとして再設計

### Not Changed

- EAロジックは変更していません
- CSVを書き換えません
- 売買条件の変更提案は行いません
- 外部AI APIは使用していません

## v1.0

- TradeHistory、NearMissHistory、EngineActivity、SessionResearchなどのCSV読込に対応
- Dashboard、Trade Analysis、Engine Analysis、Near Miss Analysis、Session Analysis、Signal Analysis、CSV Managerを作成
- Chart.jsによる基本グラフ表示を実装
