# Book Manager

自宅や研究室の蔵書を管理するためのセルフホスト向けWebアプリケーションです。

## 技術スタック

- Frontend: React + TypeScript + Vite
- Backend: Node.js 24 LTS + TypeScript + Fastify
- Database: SQLite
- ORM: Drizzle ORM
- Package manager: pnpm workspace
- Environment manager: mise
- Self-hosting: Docker Compose

## 初期セットアップ

```powershell
Copy-Item .env.example .env
mise install
mise run install
mise run dev
```

Docker Composeで起動する場合:

```powershell
Copy-Item .env.example .env
docker compose up
```

SQLiteデータベースは標準で `/data/book-manager.sqlite` を使います。Docker Composeでは `./data:/data` をマウントするため、通常のバックアップは `data/book-manager.sqlite` を保存してください。

## ドキュメント

仕様、設計、ロードマップは [Docs/README.md](./Docs/README.md) を参照してください。
