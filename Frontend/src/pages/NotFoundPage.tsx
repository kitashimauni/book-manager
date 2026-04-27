import { Link } from "../components/Link.js";

export function NotFoundPage() {
  return (
    <section className="page-panel">
      <div className="page-heading">
        <p className="eyebrow">404</p>
        <h2>画面が見つかりません</h2>
        <p>指定されたURLに対応する画面はまだありません。</p>
      </div>
      <Link className="primary-action" href="/books">
        本一覧へ戻る
      </Link>
    </section>
  );
}
