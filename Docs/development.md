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

## Docker Compose起動

```powershell
Copy-Item .env.example .env
docker compose up
```

標準ポート:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

## SQLiteデータ

標準のSQLiteデータベースパスは `/data/book-manager.sqlite` です。

Docker Composeでは `./data:/data` をマウントします。通常のバックアップは、ホスト側の `data/book-manager.sqlite` を保存する運用を基本とします。

## 環境変数

| 名前 | 必須 | 説明 |
| --- | --- | --- |
| `FRONTEND_PORT` | 任意 | Frontendの公開ポート。初期値は `3000` |
| `BACKEND_PORT` | 任意 | Backendの公開ポート。初期値は `3001` |
| `VITE_API_BASE_URL` | 任意 | Frontendから見るBackend URL |
| `VITE_DEV_PROXY_TARGET` | 任意 | Vite開発プロキシが接続するBackend URL |
| `CORS_ORIGIN` | 任意 | Backendが許可するFrontend origin |
| `DATABASE_PATH` | 任意 | SQLiteデータベースパス |
| `OPEN_LIBRARY_APP_NAME` | 任意 | Open Library APIに送るアプリ名 |
| `OPEN_LIBRARY_CONTACT` | 任意 | Open Library APIに送る連絡先 |

## HTTPS

HTTPS対応はアプリ内で固定せず、セルフホスト環境のリバースプロキシや運用方針に委ねます。
