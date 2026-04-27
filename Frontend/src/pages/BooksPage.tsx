import { Link } from "../components/Link.js";
import { EmptyState } from "../components/StateBlocks.js";

export function BooksPage() {
  return (
    <section className="page-panel">
      <div className="page-heading">
        <p className="eyebrow">Books</p>
        <h2>本一覧</h2>
        <p>タイトル、著者、ISBN、本のバーコード、管理用バーコードで検索できる画面にします。</p>
      </div>
      <EmptyState title="まだ本一覧UIは未実装です">
        次の画面実装Issueで、検索、保管場所絞り込み、分類タグ絞り込み、詳細導線を追加します。
      </EmptyState>
      <Link className="primary-action" href="/books/new">
        本登録画面へ
      </Link>
    </section>
  );
}
