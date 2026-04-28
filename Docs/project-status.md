# プロジェクト状況

最終更新: 2026-04-28

このドキュメントは、実装済みの範囲、Open Issue、Open PRを短く確認するための作業メモです。詳細仕様は各Docsを正とし、このファイルは現在地の確認に使います。

## 現在の実装状況

### 実装済み

- Backend基盤、SQLite、Drizzle migration
- 本、保管場所、分類タグのBackend API
- 本の一覧、詳細、登録、編集、詳細画面からの削除
- 保管場所管理画面、分類タグ管理画面
- ISBN lookup flow
- Webカメラバーコード読み取り
- JSON Export/Import API
- Backend/Frontendの基本テスト、lint、build
- Docker Compose起動設定

### Open PR

- [#27 Frontend JSON export and import screen](https://github.com/kitashimauni/book-manager/pull/27)
- [#29 Add NDL Search ISBN lookup provider](https://github.com/kitashimauni/book-manager/pull/29)

### Open Issue

- [#13 Frontend: implement JSON export/import screen](https://github.com/kitashimauni/book-manager/issues/13)
- [#14 Docs: keep implementation docs aligned during MVP](https://github.com/kitashimauni/book-manager/issues/14)
- [#15 QA: define MVP smoke test and self-host verification](https://github.com/kitashimauni/book-manager/issues/15)
- [#28 Backend: add NDL Search ISBN lookup provider](https://github.com/kitashimauni/book-manager/issues/28)
- [#30 Frontend: add book deletion action from list screen](https://github.com/kitashimauni/book-manager/issues/30)
- [#31 Backend: persist external metadata lookup cache in SQLite](https://github.com/kitashimauni/book-manager/issues/31)

## 次にやること

1. PR #27を確認、mergeする。
2. PR #29を確認、mergeする。
3. #30で一覧画面から本を削除できる導線を追加する。
4. #31で外部API lookup cacheをSQLiteへ永続化する。
5. #15でDocker Composeを含むMVP smoke testを文書化する。

## 注意点

- 現在のPRは段階的に積まれています。#29は#27の上に積まれているため、基本的には#27から順に確認します。
- 本の削除APIと詳細画面の削除ボタンは実装済みです。#30は一覧画面からの削除導線を追加するIssueです。
- 外部API検索のキャッシュは現状インメモリです。SQLite永続キャッシュは#31で扱います。
