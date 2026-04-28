このリポジトリは蔵書管理用のWebアプリケーションのリポジトリです


# プロジェクト構成

* Frontend/: フロントエンド用ディレクトリ
* Backend/: バックエンド用ディレクトリ
* Docs/: 企画や設計、実装メモ


# コーディング規約

* Docsと照らし合わせて不整合を確認し、適宜Docsを書き換えること
* 一般に企業で用いられるようなGitとGitHubにおける手順に従うこと
    * プログラムは適宜Gitを使用してCommit & Pushをすること
    * 作業ごとにブランチを切って適切に作業すること
    * `gh` コマンドを使用してIssue機能などを活用すること
    * Issueを作成する際はラベルを活用すること


# 開発環境の注意

* Node.jsとpnpmはmiseで管理すること
* Docker Composeはホスト側の `node_modules` をマウントしない構成にすること
    * WindowsホストとLinuxコンテナでnative dependencyが混ざるため、Docker用の依存関係はimage内に閉じ込める
    * 依存関係を更新する場合の基本手順は `docker compose down` → `pnpm install` → `mise run test`
    * Docker Composeの動作確認は `docker compose up --build` を基本とする
