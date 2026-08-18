# MVPスモークテスト

MVPのリリース前に、ローカル開発環境とDocker Composeのセルフホスト環境で最低限確認する項目です。各項目は上から順番に実施し、失敗した場合は原因と環境を記録します。

## 事前準備

- [ ] リポジトリの作業ツリーが意図したコミットになっている
- [ ] Node.js 24 LTS、pnpm 10、mise、Docker Composeが利用できる
- [ ] `.env.example` をコピーして `.env` を作成する

```powershell
Copy-Item .env.example .env
```

## ローカル起動

- [ ] `mise install` が成功する
- [ ] `mise run install` が成功する
- [ ] `mise run dev` でFrontendとBackendが起動する
- [ ] ブラウザで `http://localhost:3000` を開ける
- [ ] `http://localhost:3001/api/health` が次のJSONを返す

```json
{
  "ok": true,
  "service": "book-manager-backend",
  "database": "ok"
}
```

- [ ] Frontend上部のコンパクトなAPIステータスを開くと、Backend APIの接続先とDB `ok` を確認できる
- [ ] 終了時にFrontendとBackendのプロセスを停止する

通常のホスト側テストは、依存関係をインストールした後に `mise run typecheck`、`mise run test`、`mise run build` を実行します。

## Docker Compose起動

- [ ] `docker compose up --build -d` が成功する
- [ ] `docker compose ps` で `backend` と `frontend` が起動状態になる
- [ ] `http://localhost:3000` を開ける
- [ ] `http://localhost:3000/api/health` が `200 OK` と `database: "ok"` を返す
- [ ] Frontendから本一覧、保管場所、分類タグ、JSON Export/Importへ移動できる
- [ ] `docker compose logs backend` と `docker compose logs frontend` に起動エラーがない
- [ ] 確認後に `docker compose down` で停止する

Docker Composeでは、ホスト側の `node_modules` をコンテナへマウントしません。依存関係は各イメージ内に閉じ込め、ホスト側にはSQLiteの `./data:/data` だけをマウントします。

## MVP機能

- [ ] 保管場所を登録、編集、無効化できる
- [ ] 分類タグを登録、編集、無効化できる
- [ ] 本を必須項目だけで手入力登録できる
- [ ] 本の一覧、検索、詳細、編集、削除ができる
- [ ] ISBNバーコードから書誌情報を取得できる場合、登録フォームへ反映できる
- [ ] NDL SearchまたはOpen Libraryの書誌情報が見つからない場合、手入力登録へ進める案内が表示される
- [ ] 外部書誌APIが失敗した場合も、手入力登録ができる
- [ ] JSON ExportしたデータをImportプレビューし、競合ごとに無視／上書きを選べる
- [ ] 不正なJSON、壊れた参照、重複データをImportできない
- [ ] Webカメラ読み取りは、HTTPSまたはlocalhostの安全なコンテキストでのみ確認する

外部書誌APIの失敗を確認する場合は、テスト環境で外向き通信を一時的に遮断するなどして `/api/books/lookup` を失敗させます。エラー表示後も本登録画面を開き、タイトルなどを手入力して登録できることを確認します。

## SQLiteデータとバックアップ

- [ ] Docker Compose停止後に `data/book-manager.sqlite` が作成されている
- [ ] WALモード利用時は `book-manager.sqlite-wal` と `book-manager.sqlite-shm` の有無を確認する
- [ ] アプリケーション停止後、SQLiteファイル一式をバックアップ先へコピーできる
- [ ] バックアップから `data/` へ戻し、再起動後に蔵書データが復元される

通常のファイルコピーはアプリケーション停止中に行います。稼働中に取得する場合はSQLiteのバックアップ機能を使い、`book-manager.sqlite` だけを単独でコピーしないでください。

## 確認結果の記録

実施日、コミット、実行環境（OS、Node.js、pnpm、Docker Compose）、各項目の結果、失敗時のログをPRまたはリリース記録に残します。
