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
| `POST` | `/api/books/lookup` | 本のバーコードから外部APIで書誌情報を取得 |
| `GET` | `/api/locations` | 保管場所タグの一覧取得 |
| `POST` | `/api/locations` | 保管場所タグの登録 |
| `PUT` | `/api/locations/:id` | 保管場所タグの更新 |
| `DELETE` | `/api/locations/:id` | 保管場所タグの無効化 |

## GET /api/books

### クエリパラメータ

| 名前 | 必須 | 説明 |
| --- | --- | --- |
| `q` | 任意 | タイトル、著者、ISBN、本のバーコード、管理用バーコードを対象にしたキーワード |
| `locationId` | 任意 | 保管場所タグID |
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
  "managementMemo": "付箋あり"
}
```

### 成功時

- HTTPステータス: `201 Created`
- 作成された本を返します。

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

### バリデーションエラー

- HTTPステータス: `400 Bad Request`
- 項目ごとのエラー内容を返します。

## DELETE /api/books/:id

### 成功時

- HTTPステータス: `204 No Content`

### 存在しない場合

- HTTPステータス: `404 Not Found`

## POST /api/books/lookup

本のバーコードから外部APIで書誌情報を取得します。

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
  "source": "external"
}
```

### 見つからない場合

- HTTPステータス: `404 Not Found`
- 手入力登録に進めるよう、フロントエンドではエラーではなく案内として表示します。

### 方針

- 外部APIの第一候補はopenBDとします。
- openBDで取得できない場合の補助候補としてGoogle Books APIを検討します。
- 外部APIが失敗しても本の手入力登録はできるようにします。
- 取得結果は登録前の入力補助として扱い、自動保存はしません。

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

## PUT /api/locations/:id

### 成功時

- HTTPステータス: `200 OK`
- 更新後の保管場所タグを返します。

## DELETE /api/locations/:id

### 成功時

- HTTPステータス: `204 No Content`
- MVPでは物理削除ではなく `isActive = false` へ更新します。

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
