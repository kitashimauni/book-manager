# API仕様

## 方針

MVPではREST APIとして設計します。レスポンス形式はJSONです。

## エンドポイント一覧

| メソッド | パス | 説明 |
| --- | --- | --- |
| `GET` | `/api/books` | 本の一覧取得、検索、絞り込み |
| `POST` | `/api/books` | 本の登録 |
| `GET` | `/api/books/:id` | 本の詳細取得 |
| `PUT` | `/api/books/:id` | 本の更新 |
| `DELETE` | `/api/books/:id` | 本の削除 |
| `POST` | `/api/books/lookup` | ISBNまたはISBNとして解釈できる本のバーコードから外部APIで書誌情報を取得 |
| `GET` | `/api/locations` | 保管場所タグの一覧取得 |
| `POST` | `/api/locations` | 保管場所タグの登録 |
| `PUT` | `/api/locations/:id` | 保管場所タグの更新 |
| `DELETE` | `/api/locations/:id` | 保管場所タグの無効化 |
| `GET` | `/api/classification-tags` | 分類タグの一覧取得 |
| `POST` | `/api/classification-tags` | 分類タグの登録 |
| `PUT` | `/api/classification-tags/:id` | 分類タグの更新 |
| `DELETE` | `/api/classification-tags/:id` | 分類タグの無効化 |
| `GET` | `/api/export` | 蔵書データをJSON形式でExport |
| `POST` | `/api/import/preview` | Import内容を検証し、追加、上書き候補、無視候補、エラーを取得 |
| `POST` | `/api/import` | 蔵書データをJSON形式でImport |

## GET /api/books

### クエリパラメータ

| 名前 | 必須 | 説明 |
| --- | --- | --- |
| `q` | 任意 | タイトル、著者、ISBN、本のバーコード、管理用バーコードを対象にしたキーワード |
| `locationId` | 任意 | 保管場所タグID |
| `classificationTagId` | 任意 | 分類タグID |
| `page` | 任意 | ページ番号。初期値は1 |
| `limit` | 任意 | 1ページあたりの件数。初期値は20 |

### レスポンス例

```json
{
  "items": [
    {
      "id": "1",
      "title": "Clean Code",
      "author": "Robert C. Martin",
      "publisher": "Prentice Hall",
      "publishedDate": "2008-08-01",
      "isbn": "9780132350884",
      "bookBarcode": "9780132350884",
      "managementBarcode": "BM-000001",
      "location": {
        "id": "1",
        "name": "仕事部屋"
      },
      "classificationTags": [
        {
          "id": "1",
          "name": "Software Engineering"
        }
      ],
      "managementMemo": "付箋あり",
      "createdAt": "2026-04-26T00:00:00Z",
      "updatedAt": "2026-04-26T00:00:00Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

## POST /api/books

### リクエスト例

```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "publisher": "Prentice Hall",
  "publishedDate": "2008-08-01",
  "isbn": "9780132350884",
  "bookBarcode": "9780132350884",
  "managementBarcode": "BM-000001",
  "locationId": "1",
  "classificationTagIds": ["1"],
  "managementMemo": "付箋あり"
}
```

### 成功時

- HTTPステータス: `201 Created`
- 作成された本を返します。

### バリデーションエラー

- HTTPステータス: `400 Bad Request`
- `title` は必須です。
- `locationId` は登録済みの保管場所タグIDのみ許可します。
- `classificationTagIds` は登録済みの分類タグIDのみ許可します。
- `managementMemo` は5000文字以下です。

### 重複エラー

- HTTPステータス: `409 Conflict`
- `managementBarcode` が既存の本と重複する場合に返します。
- `isbn` の重複はMVPではエラーにせず、登録を許可します。

## GET /api/books/:id

### 成功時

- HTTPステータス: `200 OK`
- 指定された本を返します。

### 存在しない場合

- HTTPステータス: `404 Not Found`

## PUT /api/books/:id

### 成功時

- HTTPステータス: `200 OK`
- 更新後の本を返します。

### 存在しない場合

- HTTPステータス: `404 Not Found`

### バリデーションエラー

- HTTPステータス: `400 Bad Request`
- 項目ごとのエラー内容を返します。
- 少なくとも1つの更新項目が必要です。
- `locationId` は登録済みの保管場所タグIDのみ許可します。
- `classificationTagIds` は登録済みの分類タグIDのみ許可します。

### 重複エラー

- HTTPステータス: `409 Conflict`
- `managementBarcode` が他の本と重複する場合に返します。

## DELETE /api/books/:id

### 成功時

- HTTPステータス: `204 No Content`

### 存在しない場合

- HTTPステータス: `404 Not Found`

## POST /api/books/lookup

ISBNまたはISBNとして解釈できる本のバーコードから外部APIで書誌情報を取得します。

### リクエスト例

```json
{
  "bookBarcode": "9780132350884"
}
```

### 成功時

- HTTPステータス: `200 OK`
- 取得できた書誌情報を返します。

```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "publisher": "Prentice Hall",
  "publishedDate": "2008-08-01",
  "isbn": "9780132350884",
  "externalSource": "ndl_search",
  "externalId": "https://ndlsearch.ndl.go.jp/books/R100000002-I032705948",
  "classificationTagCandidates": ["Software Engineering", "Programming"]
}
```

### 見つからない場合

- HTTPステータス: `404 Not Found`
- 手入力登録に進めるよう、フロントエンドではエラーではなく案内として表示します。

### 方針

- 外部APIはNDLサーチAPIを優先し、見つからない場合のみOpen Library APIへフォールバックします。
- バックエンドはまずNDLサーチOpenSearch APIを使い、ISBNまたはISBNとして解釈できる本のバーコードで完全一致照会します。
- 日本の書籍の2段バーコードでは、上段がISBN由来の書籍JANコード、下段が価格などを含むコードであることが多いため、外部API照会に使うのはISBNとして解釈できる値だけです。
- NDLサーチで取得できない場合は、Open Library ISBN APIで完全一致照会します。
- ISBNとして解釈できない値の場合は外部APIを呼び出さず、手入力登録に進めます。読み取り値自体は本登録、更新APIの `bookBarcode` として保存できます。
- 完全一致で取得できた場合は、1件の書誌情報として扱い、候補選択UIは表示しません。
- NDLサーチ、Open Libraryのどちらでも取得できない場合はSearch APIへフォールバックせず、手入力登録に進めます。
- MVPでは外部APIによる候補選択UIは実装しません。
- 外部APIを呼び出す場合は、アプリ名と連絡先を含む `User-Agent` を設定します。
- 外部APIの利用は低頻度のリアルタイム照会に限定し、同じISBNの照会結果は `provider + normalized ISBN` 単位でSQLiteにキャッシュします。
- キャッシュは取得成功だけでなく未検出結果も保存し、有効期限は `LOOKUP_CACHE_TTL_DAYS` で設定します。初期値は30日です。
- 外部APIへの連続リクエストはアプリ側で制限し、未識別時1 req/sec、識別時3 req/secを超えないようにします。
- 外部APIが失敗しても本の手入力登録はできるようにします。
- 外部APIの失敗時は `502 Bad Gateway` として返し、フロントエンドでは手入力登録へ進める案内を表示します。
- 取得結果は登録前の入力補助として扱い、自動保存はしません。
- NDLサーチまたはOpen Library APIのsubjectは分類タグ候補として扱い、ユーザーが確定したものだけ保存します。

### 複数フロントエンド連携

- 将来的にAndroidフロントエンドを追加する場合も、このエンドポイントに同じJSON形式で接続できます。
- フロントエンドは、読み取ったバーコード文字列を本登録、更新APIの `bookBarcode` または `managementBarcode` として送信します。
- 書誌情報取得にはISBNとして解釈できる `bookBarcode` だけを使い、ISBNではないJAN、雑誌コード、価格コードなどは保存用の読み取り値として扱います。
- Webフロントエンド固有のセッション状態に依存しないAPI設計にします。

## GET /api/locations

### 成功時

- HTTPステータス: `200 OK`
- 保管場所タグの一覧を返します。

```json
{
  "items": [
    {
      "id": "1",
      "name": "仕事部屋",
      "description": "仕事部屋の本棚",
      "sortOrder": 10,
      "isActive": true,
      "createdAt": "2026-04-26T00:00:00Z",
      "updatedAt": "2026-04-26T00:00:00Z"
    }
  ]
}
```

## POST /api/locations

### リクエスト例

```json
{
  "name": "仕事部屋",
  "description": "仕事部屋の本棚",
  "sortOrder": 10
}
```

### 成功時

- HTTPステータス: `201 Created`
- 作成された保管場所タグを返します。

### バリデーションエラー

- HTTPステータス: `400 Bad Request`
- `name` は空文字を許可しません。
- `sortOrder` は0以上の整数とします。

### 重複エラー

- HTTPステータス: `409 Conflict`
- 同じ `name` の保管場所タグが既に存在する場合に返します。

## PUT /api/locations/:id

### リクエスト例

```json
{
  "name": "仕事部屋",
  "description": "仕事部屋の本棚",
  "sortOrder": 10,
  "isActive": true
}
```

### 成功時

- HTTPステータス: `200 OK`
- 更新後の保管場所タグを返します。

### 存在しない場合

- HTTPステータス: `404 Not Found`

### バリデーションエラー

- HTTPステータス: `400 Bad Request`
- 少なくとも1つの更新項目が必要です。
- `name` は空文字を許可しません。
- `sortOrder` は0以上の整数とします。

### 重複エラー

- HTTPステータス: `409 Conflict`
- 同じ `name` の保管場所タグが既に存在する場合に返します。

## DELETE /api/locations/:id

### 成功時

- HTTPステータス: `204 No Content`
- MVPでは物理削除ではなく `isActive = false` へ更新します。

### 存在しない場合

- HTTPステータス: `404 Not Found`

## GET /api/classification-tags

### 成功時

- HTTPステータス: `200 OK`
- 分類タグの一覧を返します。

```json
{
  "items": [
    {
      "id": "1",
      "name": "Software Engineering",
      "description": "",
      "source": "open_library",
      "isActive": true,
      "createdAt": "2026-04-26T00:00:00Z",
      "updatedAt": "2026-04-26T00:00:00Z"
    }
  ]
}
```

## POST /api/classification-tags

### リクエスト例

```json
{
  "name": "Software Engineering",
  "description": "",
  "source": "manual"
}
```

### 成功時

- HTTPステータス: `201 Created`
- 作成された分類タグを返します。
- `source` 未指定時は `manual` として作成します。

### バリデーションエラー

- HTTPステータス: `400 Bad Request`
- `name` は空文字を許可しません。
- `source` は `manual`、`ndl_search`、`open_library` のみ許可します。

### 重複エラー

- HTTPステータス: `409 Conflict`
- 同じ `name` の分類タグが既に存在する場合に返します。

## PUT /api/classification-tags/:id

### リクエスト例

```json
{
  "name": "Software Engineering",
  "description": "",
  "source": "manual",
  "isActive": true
}
```

### 成功時

- HTTPステータス: `200 OK`
- 更新後の分類タグを返します。

### 存在しない場合

- HTTPステータス: `404 Not Found`

### バリデーションエラー

- HTTPステータス: `400 Bad Request`
- 少なくとも1つの更新項目が必要です。
- `name` は空文字を許可しません。
- `source` は `manual`、`ndl_search`、`open_library` のみ許可します。

### 重複エラー

- HTTPステータス: `409 Conflict`
- 同じ `name` の分類タグが既に存在する場合に返します。

## DELETE /api/classification-tags/:id

### 成功時

- HTTPステータス: `204 No Content`
- MVPでは物理削除ではなく `isActive = false` へ更新します。

### 存在しない場合

- HTTPステータス: `404 Not Found`

## GET /api/export

蔵書データをJSON形式でExportします。

### 成功時

- HTTPステータス: `200 OK`
- Export対象は本、保管場所タグ、分類タグ、本と分類タグの関連です。
- JSON Exportはバックアップ、移行、復元用の正式形式です。
- CSV Exportは他ツールでの閲覧、分析用として別機能で扱います。

```json
{
  "version": 1,
  "exportedAt": "2026-04-26T00:00:00Z",
  "books": [],
  "locations": [],
  "classificationTags": [],
  "bookClassificationTags": []
}
```

## POST /api/import/preview

ExportしたJSONファイルを検証し、Import前のプレビューを返します。

### リクエスト例

```json
{
  "version": 1,
  "books": [],
  "locations": [],
  "classificationTags": [],
  "bookClassificationTags": []
}
```

### 成功時

- HTTPステータス: `200 OK`
- 追加される項目、既存データと重複する項目、Importできない項目を返します。
- 競合の初期解決方針は `skip` です。
- 重複判定は、管理用バーコード、保管場所タグ名、分類タグ名を基本にします。
- 安全な復元のため、IDが既存データと衝突する場合も競合として扱います。

```json
{
  "summary": {
    "create": 8,
    "conflict": 2,
    "error": 0
  },
  "conflicts": [
    {
      "entity": "book",
      "matchBy": "managementBarcode",
      "incomingId": "import-book-1",
      "existingId": "1",
      "defaultAction": "skip",
      "availableActions": ["overwrite", "skip"]
    }
  ],
  "errors": []
}
```

## POST /api/import

プレビュー結果に対する解決方針を指定してImportを実行します。

### リクエスト例

```json
{
  "version": 1,
  "books": [],
  "locations": [],
  "classificationTags": [],
  "bookClassificationTags": [],
  "conflictResolution": {
    "defaultAction": "skip",
    "items": [
      {
        "entity": "book",
        "incomingId": "import-book-1",
        "existingId": "1",
        "action": "overwrite"
      }
    ]
  }
}
```

### 成功時

- HTTPステータス: `200 OK`
- Import結果を返します。

```json
{
  "imported": {
    "books": 10,
    "locations": 2,
    "classificationTags": 4
  },
  "overwritten": {
    "books": 1,
    "locations": 0,
    "classificationTags": 0
  },
  "skipped": {
    "books": 1,
    "locations": 0,
    "classificationTags": 0
  }
}
```

### バリデーションエラー

- HTTPステータス: `400 Bad Request`
- JSON形式の不正、必須項目不足、参照先が存在しない関連データなど、ユーザー選択で解決できないエラーを返します。
- 重複はエラーではなく、Importプレビューで競合として返します。
- `conflictResolution.defaultAction` に `overwrite` を指定すると、競合項目をまとめて上書きできます。
- `conflictResolution.defaultAction` に `skip` を指定すると、競合項目をまとめて無視できます。
- `conflictResolution.items` では個別の競合ごとに `overwrite` または `skip` を指定できます。

## エラーレスポンス形式

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "title",
      "message": "タイトルは必須です"
    }
  ]
}
```
