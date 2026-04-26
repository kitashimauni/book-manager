# データ設計

## エンティティ

MVPでは `books` と `locations` を扱います。

## books

| カラム | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `id` | UUIDまたはINTEGER | 必須 | 本の一意識別子 |
| `title` | string | 必須 | タイトル |
| `author` | string | 任意 | 著者。MVPでは文字列で保持 |
| `publisher` | string | 任意 | 出版社 |
| `published_date` | date | 任意 | 出版日 |
| `isbn` | string | 任意 | ISBN-10またはISBN-13 |
| `book_barcode` | string | 任意 | 書籍自体に印刷されているISBN/JANなどのバーコード |
| `management_barcode` | string | 任意 | 利用者が独自に貼付する管理用バーコード |
| `location_id` | UUIDまたはINTEGER | 任意 | 保管場所タグのID |
| `management_memo` | text | 任意 | 管理用メモ |
| `created_at` | datetime | 必須 | 登録日時 |
| `updated_at` | datetime | 必須 | 更新日時 |

## locations

| カラム | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `id` | UUIDまたはINTEGER | 必須 | 保管場所タグの一意識別子 |
| `name` | string | 必須 | 保管場所名 |
| `description` | string | 任意 | 説明 |
| `sort_order` | integer | 必須 | 表示順 |
| `is_active` | boolean | 必須 | 本の登録、編集で選択可能か |
| `created_at` | datetime | 必須 | 登録日時 |
| `updated_at` | datetime | 必須 | 更新日時 |

## 制約

- `title` は空文字を許可しません。
- `isbn` は未入力を許可します。
- MVPでは `isbn` の重複は警告に留め、登録自体は許可します。
- `book_barcode` は未入力を許可します。
- `management_barcode` は未入力を許可します。
- `management_barcode` は入力された場合、一意である必要があります。
- `location_id` は未入力を許可します。
- `locations.name` は空文字を許可しません。
- `locations.name` は一意である必要があります。
- 既に本に紐づいている保管場所タグは物理削除せず、`is_active = false` とします。

## インデックス候補

- `title`
- `author`
- `isbn`
- `book_barcode`
- `management_barcode`
- `location_id`
- `updated_at`
- `locations.name`
- `locations.sort_order`

## 将来の正規化候補

MVPでは実装しませんが、機能拡張時に以下のテーブル分割を検討します。

- `authors`: 著者を複数人で管理する
- `users`: ユーザー認証、複数ユーザー管理
- `loans`: 貸出管理
- `book_images`: 表紙画像管理
- `book_locations`: 1冊を複数の保管場所に分割して管理する
