# 第三者データ表示

## 日本図書館協会 NDC9 Linked Data

- 出典: [NDCデータ（NDC8版および9版）](https://www.jla.or.jp/committees/bunrui/ndc-data/)
- 提供者: 公益社団法人 日本図書館協会 分類委員会
- 対象データ: JLAが公開するNDC9版のLinked Data（Turtle）のうち、NDC9の分類記号、文脈付き分類項目名、上位分類項目の関係
- ライセンス: CC BY
- 利用箇所: `Backend/src/data/ndc9.ts`

`Backend/src/data/ndc9.ts` は、上記ページから取得した `ndc9.ttl` を `Backend/scripts/generate-ndc9-data.mjs` で実行時参照用のTypeScriptデータへ変換したものです。変換後のデータは、分類記号をキーに `rdfs:label` と `skos:broader` を保持します。アプリケーションはNDLサーチから受け取ったNDC9だけを照合し、解決できた文脈付き分類項目名を分類タグ候補として表示します。

NDC9 Linked Dataの利用・再配布時は、上記出典とCC BYライセンスの表示を維持します。NDC10のデータは本リポジトリに含めません。
