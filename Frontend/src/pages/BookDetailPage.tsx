import { Link } from "../components/Link.js";

type BookDetailPageProps = {
  bookId: string;
};

export function BookDetailPage({ bookId }: BookDetailPageProps) {
  return (
    <section className="page-panel">
      <div className="page-heading">
        <p className="eyebrow">Book Detail</p>
        <h2>本詳細</h2>
        <p>対象ID: {bookId} の詳細情報、削除確認、編集導線を表示する画面にします。</p>
      </div>
      <Link className="primary-action" href={`/books/${bookId}/edit`}>
        編集画面へ
      </Link>
    </section>
  );
}
