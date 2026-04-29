# 開発手順

## 前提

- Node.js 24 LTS
- pnpm
- mise
- Docker Compose

Node.jsとpnpmはmiseで管理します。リポジトリルートの `mise.toml` を正とします。

## ローカル起動

```powershell
Copy-Item .env.example .env
mise install
mise run install
mise run dev
```

## 依存関係の更新とテスト

Docker Composeはコンテナ内で依存関係をインストールし、実行時にホスト側の `node_modules` をマウントしません。WindowsホストとLinuxコンテナでnative dependencyが混ざらないよう、Docker用の依存関係はimage内に閉じ込めます。

ホスト側の依存関係を更新する場合や、壊れた `node_modules` を作り直す場合は、念のためDocker Composeのコンテナを停止してから `pnpm install` を実行します。

```powershell
docker compose down
pnpm install
mise run test
```

通常の実装確認では、ホスト側で `pnpm install` が完了している状態なら `mise run test` を実行します。

## CI

GitHub ActionsではPull Requestと `main` へのpush時に、`mise.toml` で指定したNode.jsとpnpmを使って以下を実行します。

- `mise run install-ci`
- `mise run typecheck`
- `mise run test`
- `mise run build`
- `docker compose build`

CIでもDocker Composeはホスト側の `node_modules` をマウントせず、Dockerfile内で依存関係をインストールします。

## Docker Compose起動

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Docker Composeでは、backend/frontendはそれぞれDockerfileからbuildしたimageとして動作します。ソースコードや `node_modules` は実行時にbind mountせず、SQLiteデータ保存用の `./data:/data` だけをマウントします。

Frontendコンテナはnginxで静的ファイルを配信し、`/api` をbackendコンテナへプロキシします。Docker Composeでは `DOCKER_VITE_API_BASE_URL` を空にすると同一オリジンの `/api` を使うため、この設定を推奨します。

標準ポート:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

## SQLiteデータ

標準のSQLiteデータベースパスは `/data/book-manager.sqlite` です。

Docker Composeでは `./data:/data` をマウントします。通常のバックアップは、ホスト側の `data/book-manager.sqlite` を保存する運用を基本とします。

## DB Migration

Backendは起動時にDrizzle migrationを適用します。migrationファイルは `Backend/drizzle/` に管理します。

Schemaを変更した場合は、以下でmigrationを生成します。

```powershell
pnpm --filter @book-manager/backend db:generate
```

手動でmigrationを適用する場合は、`DATABASE_PATH` を指定して以下を実行します。

```powershell
pnpm --filter @book-manager/backend db:migrate
```

## 環境変数

| 名前 | 必須 | 説明 |
| --- | --- | --- |
| `FRONTEND_PORT` | 任意 | Frontendの公開ポート。初期値は `3000` |
| `BACKEND_PORT` | 任意 | Backendの公開ポート。初期値は `3001` |
| `VITE_API_BASE_URL` | 任意 | ローカル開発時にFrontendから見るBackend URL。空の場合は同一オリジンの `/api` |
| `DOCKER_VITE_API_BASE_URL` | 任意 | Docker frontend imageのbuild時に埋め込むBackend URL。空の場合はnginxの `/api` proxy |
| `VITE_DEV_PROXY_TARGET` | 任意 | Vite開発プロキシが接続するBackend URL |
| `CORS_ORIGIN` | 任意 | Backendが許可するFrontend origin |
| `DATABASE_PATH` | 任意 | SQLiteデータベースパス |
| `LOOKUP_CACHE_TTL_DAYS` | 任意 | NDLサーチ、Open Libraryの書誌情報キャッシュ有効日数。初期値は `30` |
| `OPEN_LIBRARY_APP_NAME` | 任意 | NDLサーチ、Open Library APIに送るアプリ名 |
| `OPEN_LIBRARY_CONTACT` | 任意 | NDLサーチ、Open Library APIに送る連絡先 |

## HTTPS

HTTPS対応はアプリ内で固定せず、セルフホスト環境のリバースプロキシや運用方針に委ねます。
