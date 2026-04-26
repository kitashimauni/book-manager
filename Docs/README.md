# Book Manager Docs

このディレクトリは、蔵書管理Webアプリケーションの企画、仕様、設計、実装メモを管理します。

## ドキュメント一覧

- [プロダクト仕様](./product-spec.md): アプリの目的、対象ユーザー、MVP範囲、非対応範囲
- [機能仕様](./functional-spec.md): 画面、機能、入力項目、振る舞い
- [仕様決定事項](./spec-decisions.md): 実装前に決めるべき仕様論点、推奨案、決定状況
- [データ設計](./data-model.md): エンティティ、項目、制約、ステータス
- [API仕様](./api-spec.md): バックエンドAPIの初期案
- [実装前決定事項](./implementation-decisions.md): 実装前に決める技術方針、仕様境界、推奨初期値
- [開発ロードマップ](./roadmap.md): 実装順序、Issue化する単位、将来拡張

## 仕様更新ルール

- 実装と仕様に差分が出た場合は、実装変更と同じPull RequestでDocsも更新します。
- MVPに含める機能は `product-spec.md` の「MVPスコープ」を正とします。
- 将来拡張はすぐ実装せず、`roadmap.md` の「Phase 2以降」に退避します。
