# データ設計

## エンティティ

MVPでは `books` のみを扱います。

## books

| カラム | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `id` | UUIDまたはINTEGER | 必須 | 本の一意識別子 |
| `title` | string | 必須 | タイトル |
| `author` | string | 任意 | 著者。MVPでは文字列で保持 |
| `publisher` | string | 任意 | 出版社 |
| `published_date` | date | 任意 | 出版日 |
| `isbn` | string | 任意 | ISBN-10またはISBN-13 |
| `reading_status` | string | 必須 | 読書ステータス |
| `ownership_status` | string | 必須 | 所有ステータス |
| `location` | string | 任意 | 保管場所 |
| `memo` | text | 任意 | メモ |
| `created_at` | datetime | 必須 | 登録日時 |
| `updated_at` | datetime | 必須 | 更新日時 |

## 制約

- `title` は空文字を許可しません。
- `reading_status` は定義済みの値のみ許可します。
- `ownership_status` は定義済みの値のみ許可します。
- `isbn` は未入力を許可します。
- MVPでは `isbn` の重複は警告に留め、登録自体は許可します。

## インデックス候補

- `title`
- `author`
- `isbn`
- `reading_status`
- `ownership_status`
- `updated_at`

## 将来の正規化候補

MVPでは実装しませんが、機能拡張時に以下のテーブル分割を検討します。

- `authors`: 著者を複数人で管理する
- `tags`: 任意タグを管理する
- `book_tags`: 本とタグの関連を管理する
- `users`: ユーザー認証、複数ユーザー管理
- `loans`: 貸出管理
- `book_images`: 表紙画像管理
