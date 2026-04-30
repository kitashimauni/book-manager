# データ設計

## エンティティ

MVPでは `books`、`locations`、`classification_tags`、`book_classification_tags`、`external_lookup_cache` を扱います。

## books

| カラム | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | 必須 | 本の一意識別子 |
| `title` | string | 必須 | タイトル |
| `author` | string | 任意 | 著者。MVPでは文字列で保持 |
| `publisher` | string | 任意 | 出版社 |
| `published_date` | date | 任意 | 出版日 |
| `isbn` | string | 任意 | ISBN-10またはISBN-13。書誌情報取得に使う正規化済みの値 |
| `book_barcode` | string | 任意 | 実際に読み取った本のバーコード値。ISBN由来の書籍JANコード、雑誌コード、価格コードなどを含み得る |
| `management_barcode` | string | 任意 | 利用者が独自に貼付する管理用バーコード |
| `external_source` | string | 任意 | 書誌情報の取得元。MVPでは `ndl_search` または `open_library` |
| `external_id` | string | 任意 | 外部API側の識別子 |
| `location_id` | UUID | 任意 | 保管場所タグのID |
| `management_memo` | text | 任意 | 管理用メモ |
| `created_at` | datetime | 必須 | 登録日時 |
| `updated_at` | datetime | 必須 | 更新日時 |

## classification_tags

| カラム | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | 必須 | 分類タグの一意識別子 |
| `name` | string | 必須 | 分類タグ名 |
| `description` | string | 任意 | 説明 |
| `source` | string | 必須 | `manual`、`ndl_search`、`open_library` |
| `is_active` | boolean | 必須 | 本の登録、編集で選択可能か |
| `created_at` | datetime | 必須 | 登録日時 |
| `updated_at` | datetime | 必須 | 更新日時 |

## book_classification_tags

| カラム | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `book_id` | UUID | 必須 | 本のID |
| `classification_tag_id` | UUID | 必須 | 分類タグのID |
| `created_at` | datetime | 必須 | 登録日時 |

## locations

| カラム | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `id` | UUID | 必須 | 保管場所タグの一意識別子 |
| `name` | string | 必須 | 保管場所名 |
| `description` | string | 任意 | 説明 |
| `sort_order` | integer | 必須 | 表示順 |
| `is_active` | boolean | 必須 | 本の登録、編集で選択可能か |
| `created_at` | datetime | 必須 | 登録日時 |
| `updated_at` | datetime | 必須 | 更新日時 |

## external_lookup_cache

外部APIの照会結果をSQLiteに保存するキャッシュです。再取得可能な派生データのため、Export/Import対象には含めません。

| カラム | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `id` | string | 必須 | `provider:isbn` 形式の一意識別子 |
| `isbn` | string | 必須 | 正規化済みISBN |
| `provider` | string | 必須 | `ndl_search` または `open_library` |
| `status` | string | 必須 | `hit` または `miss` |
| `payload` | JSON text | 任意 | 正規化後の取得書誌情報。`miss` の場合は未設定 |
| `created_at` | datetime | 必須 | 初回保存日時 |
| `updated_at` | datetime | 必須 | 更新日時 |
| `expires_at` | datetime | 必須 | キャッシュ有効期限 |

## 制約

- `title` は空文字を許可しません。
- `isbn` は未入力を許可します。
- MVPでは `isbn` の重複は警告に留め、登録自体は許可します。
- `book_barcode` は未入力を許可します。
- `book_barcode` はISBNと一致する場合もありますが、ISBNではない読み取り値も許可します。
- `management_barcode` は未入力を許可します。
- `management_barcode` は入力された場合、一意である必要があります。
- `location_id` は未入力を許可します。
- `locations.name` は空文字を許可しません。
- `locations.name` は一意である必要があります。
- 既に本に紐づいている保管場所タグは物理削除せず、`is_active = false` とします。
- `classification_tags.name` は空文字を許可しません。
- `classification_tags.name` は一意である必要があります。
- 既に本に紐づいている分類タグは物理削除せず、`is_active = false` とします。
- `book_classification_tags` は `book_id` と `classification_tag_id` の組み合わせを一意にします。
- `external_lookup_cache` は `provider` と `isbn` の組み合わせを一意にします。

## インデックス候補

- `title`
- `author`
- `isbn`
- `book_barcode`
- `management_barcode`
- `external_source`
- `external_id`
- `location_id`
- `updated_at`
- `locations.name`
- `locations.sort_order`
- `classification_tags.name`
- `classification_tags.source`
- `external_lookup_cache.provider`
- `external_lookup_cache.isbn`

## 将来の正規化候補

MVPでは実装しませんが、機能拡張時に以下のテーブル分割を検討します。

- `authors`: 著者を複数人で管理する
- `users`: ユーザー認証、複数ユーザー管理
- `loans`: 貸出管理
- `book_images`: 表紙画像管理
- `book_locations`: 1冊を複数の保管場所に分割して管理する

## Export/Import対象

MVPでは以下をJSON形式でExport/Importします。

- `books`
- `locations`
- `classification_tags`
- `book_classification_tags`

`external_lookup_cache` はExport/Import対象外です。

## 将来のキャッシュ拡張

外部APIレスポンスは、将来NDC分類記号やsubjectの再解釈に使う可能性が高いため、`external_lookup_cache` は正規化後の `payload` だけでなく、request URL、response status、content type、response bodyなどの生レスポンスを保存できる形へ拡張する方針です。
