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
- カメラ読み取りクライアント連携
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

- 外部カメラ入力クライアント
- 蔵書管理の全機能を持つネイティブアプリ
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
- Integration: Webカメラ読み取りと外部入力元連携を実装する
- Frontend: Export/Import画面を実装する
- QA: MVPの動作確認手順を作成する
