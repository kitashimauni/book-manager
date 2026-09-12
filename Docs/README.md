# Book Manager Docs

このディレクトリは、蔵書管理Webアプリケーションの企画、仕様、設計、実装メモを管理します。

## ドキュメント一覧

- [プロダクト仕様](./product-spec.md): アプリの目的、対象ユーザー、MVP範囲、非対応範囲
- [機能仕様](./functional-spec.md): 画面、機能、入力項目、振る舞い
- [仕様決定事項](./spec-decisions.md): 実装前に決めるべき仕様論点、推奨案、決定状況
- [データ設計](./data-model.md): エンティティ、項目、制約、ステータス
- [API仕様](./api-spec.md): バックエンドAPIの初期案
- [実装前決定事項](./implementation-decisions.md): 実装前に決める技術方針、仕様境界、推奨初期値
- [開発手順](./development.md): ローカル開発、Docker Compose、環境変数、バックアップ
- [MVPスモークテスト](./smoke-test.md): リリース前の画面、API、Docker、SQLite確認項目
- [開発ロードマップ](./roadmap.md): 実装順序、Issue化する単位、将来拡張
- [第三者データ表示](./third-party.md): 外部データの出典、ライセンス、変換方法

## 仕様更新ルール

- 実装と仕様に差分が出た場合は、実装変更と同じPull RequestでDocsも更新します。
- MVPに含める機能は `product-spec.md` の「MVPスコープ」を正とします。
- 将来拡張はすぐ実装せず、`roadmap.md` の「Phase 2以降」に退避します。

## 実装時のDocs確認項目

実装Issueに対応するPull Requestでは、変更内容に応じて以下のDocsを確認・更新します。

- APIの入出力やエラー処理を変更した場合は `api-spec.md` を更新します。
- テーブル、カラム、制約、Export/Import範囲を変更した場合は `data-model.md` を更新します。
- 画面の入力項目やユーザー操作を変更した場合は `functional-spec.md` を更新します。
- 実装上の技術的な判断や開発手順を変更した場合は `implementation-decisions.md` または `development.md` を更新します。
- 仕様の未実装部分や保留理由が変わった場合は `roadmap.md` を更新します。
- PR本文には、Docsを更新したファイルまたは確認して変更不要だった範囲を記載します。
