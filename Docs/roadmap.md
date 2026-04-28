# 開発ロードマップ

## Phase 0: 仕様確定

完了済みです。MVPの目的、画面、データ項目、API方針、バーコード、外部API、Export/Import、セルフホスト方針はDocsに反映済みです。

## Phase 1: MVP実装

### 完了済み

- プロジェクト初期化
- pnpm workspace、mise、Docker Compose設定
- Backend基盤、SQLite、Drizzle migration
- 本CRUD API
- 保管場所API
- 分類タグAPI
- Open Library ISBN lookup hardening
- Frontend routing、API client、共通レイアウト
- 保管場所管理画面、分類タグ管理画面
- 本登録、編集、lookup flow
- 本一覧、検索、詳細画面
- Webカメラバーコード読み取り
- JSON Export/Import API
- Backend/Frontendの基本テスト整備

### 進行中

- [#13 Frontend: implement JSON export/import screen](https://github.com/kitashimauni/book-manager/issues/13)
- [#28 Backend: add NDL Search ISBN lookup provider](https://github.com/kitashimauni/book-manager/issues/28)

### 次に進める候補

- [#30 Frontend: add book deletion action from list screen](https://github.com/kitashimauni/book-manager/issues/30)
- [#31 Backend: persist external metadata lookup cache in SQLite](https://github.com/kitashimauni/book-manager/issues/31)
- [#15 QA: define MVP smoke test and self-host verification](https://github.com/kitashimauni/book-manager/issues/15)

### 継続

- [#14 Docs: keep implementation docs aligned during MVP](https://github.com/kitashimauni/book-manager/issues/14)

## Phase 1の残タスク目安

1. PR #27をmergeして、JSON Export/Import画面をMVPに入れる。
2. PR #29をmergeして、NDLサーチ優先のISBN lookupをMVPに入れる。
3. 一覧画面から本を削除できる導線を追加する。
4. 外部API lookup cacheをSQLiteへ永続化する。
5. Docker Compose起動、カメラ読み取り、lookup、CRUD、Export/Importのsmoke test手順を文書化する。

## Phase 2以降

- Androidフロントエンド
- 表紙画像表示
- 貸出管理
- ユーザー認証
- 複数ユーザー対応
- CSV Export
- CSV Import
- 重複登録チェックの強化
- 棚卸しワークフロー

## Issue運用

- 実装はGitHub Issue単位で進めます。
- 仕様や挙動が変わった場合は、該当PRで関連Docsも更新します。
- 完了済みIssueは対応PRをコメントしてCloseします。
- 進行中の現在地は [project-status.md](./project-status.md) を確認します。
