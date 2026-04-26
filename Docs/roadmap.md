# 開発ロードマップ

## Phase 0: 仕様確定

- MVPの機能範囲を決める
- データ項目を決める
- 画面一覧を決める
- API仕様の初期案を決める
- バーコードと外部API連携の仕様を決める
- 保管場所タグの仕様を決める
- 分類タグの仕様を決める
- Export/Importの仕様を決める
- 実装タスクをIssue化する

## Phase 1: MVP実装

### 1. プロジェクト初期化

- `Frontend/` を作成する
- `Backend/` を作成する
- pnpm workspaceを作成する
- miseでNode.js 24 LTSとpnpm利用環境を固定する
- Docker Compose設定を作成する
- ローカル開発手順を `Docs/` に追加する

### 2. バックエンド基盤

- APIサーバーを起動できるようにする
- DB接続を設定する
- `books` テーブルを作成する
- `locations` テーブルを作成する
- `classification_tags` テーブルを作成する
- `book_classification_tags` テーブルを作成する
- バリデーションを実装する

### 3. 本CRUD API

- 本一覧取得API
- 本登録API
- 本詳細取得API
- 本更新API
- 本削除API
- 本のバーコードから書誌情報を取得するAPI
- 保管場所タグAPI
- 分類タグAPI
- Export/Import API
- APIテスト

### 4. フロントエンド基盤

- 画面ルーティング
- APIクライアント
- 共通レイアウト
- フォーム部品

### 5. 本管理画面

- 本一覧画面
- 検索、絞り込み
- 本登録画面
- 本詳細画面
- 本編集画面
- 保管場所タグ管理画面
- 分類タグ管理画面
- 本のバーコード読み取りによる書誌情報取得
- Webカメラ読み取り連携
- 管理用バーコード入力、検索
- JSON Export/Import画面
- 削除確認

### 6. MVP仕上げ

- README整備
- 動作確認手順の整理
- エラーハンドリングの確認
- セルフホスト向け設定の整理
- SQLiteデータベースファイルのマウントとバックアップ手順の整理
- UIの最低限の調整

## Phase 2以降

- Androidフロントエンド
- 表紙画像表示
- 貸出管理
- ユーザー認証
- 複数ユーザー対応
- CSV Import/Export
- 重複登録チェックの強化
- 棚卸しワークフロー

## 初期Issue案

- Docs: MVP仕様を作成する
- Setup: Frontendプロジェクトを初期化する
- Setup: Backendプロジェクトを初期化する
- Setup: pnpm workspaceとmise設定を作成する
- Setup: Docker Compose構成を作成する
- Backend: booksテーブルを作成する
- Backend: locationsテーブルを作成する
- Backend: classification_tagsテーブルを作成する
- Backend: 本CRUD APIを実装する
- Backend: バーコード書誌情報取得APIを実装する
- Backend: 保管場所タグAPIを実装する
- Backend: 分類タグAPIを実装する
- Backend: Export/Import APIを実装する
- Frontend: 本一覧画面を実装する
- Frontend: 本登録、編集画面を実装する
- Frontend: 本詳細画面を実装する
- Frontend: 保管場所タグ管理画面を実装する
- Frontend: 分類タグ管理画面を実装する
- Frontend: バーコード入力と書誌情報取得を実装する
- Frontend: Webカメラ読み取りを実装する
- Frontend: Export/Import画面を実装する
- QA: MVPの動作確認手順を作成する

## GitHub Issue対応

Phase 1の実装は、以下のGitHub Issueを基本単位として進めます。

### 推奨着手順

1. [#4 Backend: DB migration and application foundation](https://github.com/kitashimauni/book-manager/issues/4)
2. [#3 Backend: implement locations API](https://github.com/kitashimauni/book-manager/issues/3)
3. [#2 Backend: implement classification tags API](https://github.com/kitashimauni/book-manager/issues/2)
4. [#1 Backend: implement books CRUD API](https://github.com/kitashimauni/book-manager/issues/1)
5. [#7 Backend: harden Open Library ISBN lookup](https://github.com/kitashimauni/book-manager/issues/7)
6. [#5 Frontend: add routing, API client, and shared layout](https://github.com/kitashimauni/book-manager/issues/5)
7. [#10 Frontend: implement location and classification tag management screens](https://github.com/kitashimauni/book-manager/issues/10)
8. [#11 Frontend: implement book create/edit form and ISBN lookup flow](https://github.com/kitashimauni/book-manager/issues/11)
9. [#12 Frontend: implement book list, search, and detail screens](https://github.com/kitashimauni/book-manager/issues/12)
10. [#9 Frontend: implement web camera barcode scanning](https://github.com/kitashimauni/book-manager/issues/9)
11. [#8 Backend: implement JSON export/import API](https://github.com/kitashimauni/book-manager/issues/8)
12. [#13 Frontend: implement JSON export/import screen](https://github.com/kitashimauni/book-manager/issues/13)
13. [#6 Backend: add API test coverage](https://github.com/kitashimauni/book-manager/issues/6)
14. [#15 QA: define MVP smoke test and self-host verification](https://github.com/kitashimauni/book-manager/issues/15)

### 継続Issue

- [#14 Docs: keep implementation docs aligned during MVP](https://github.com/kitashimauni/book-manager/issues/14)

実装時に仕様や挙動が変わった場合は、該当IssueのPRで関連Docsも更新します。
