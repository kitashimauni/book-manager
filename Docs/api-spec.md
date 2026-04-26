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

## GET /api/books

### クエリパラメータ

| 名前 | 必須 | 説明 |
| --- | --- | --- |
| `q` | 任意 | タイトル、著者、ISBNを対象にしたキーワード |
| `readingStatus` | 任意 | 読書ステータス |
| `ownershipStatus` | 任意 | 所有ステータス |
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
      "readingStatus": "finished",
      "ownershipStatus": "owned",
      "location": "仕事部屋",
      "memo": "設計原則の復習用",
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
  "readingStatus": "finished",
  "ownershipStatus": "owned",
  "location": "仕事部屋",
  "memo": "設計原則の復習用"
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
