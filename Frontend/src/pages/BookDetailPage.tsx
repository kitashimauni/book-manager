import { useEffect, useState } from "react";
import { deleteBook, getBook, type ApiError, type Book } from "../api/client.js";
import { Link } from "../components/Link.js";
import { ErrorState, LoadingState } from "../components/StateBlocks.js";
import { navigateTo } from "../router.js";

type BookDetailPageProps = {
  bookId: string;
};

export function BookDetailPage({ bookId }: BookDetailPageProps) {
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadBook() {
      setIsLoading(true);

      try {
        const result = await getBook(bookId);

        if (!isMounted) {
          return;
        }

        setBook(result);
        setError(null);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError as ApiError);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBook();

    return () => {
      isMounted = false;
    };
  }, [bookId]);

  async function handleDelete() {
    if (!book || !window.confirm(`「${book.title}」を削除しますか？この操作は元に戻せません。`)) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteBook(book.id);
      navigateTo("/books");
    } catch (deleteError) {
      setError(deleteError as ApiError);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="page-panel">
      <div className="page-heading">
        <p className="eyebrow">Book Detail</p>
        <h2>本詳細</h2>
        <p>登録済みの書誌情報、バーコード、保管場所、分類タグ、管理メモを確認できます。</p>
      </div>

      {error ? <ErrorState title="本詳細の取得に失敗しました">{formatApiError(error)}</ErrorState> : null}

      {isLoading ? <LoadingState title="本詳細を読み込み中" /> : null}

      {!isLoading && book ? (
        <article className="book-detail">
          <header className="book-detail-hero">
            <div>
              <p className="eyebrow">{book.location?.name ?? "No Location"}</p>
              <h3>{book.title}</h3>
              <p>{book.author || "著者未設定"}</p>
            </div>
            <div className="card-actions">
              <Link className="button-secondary link-button" href="/books">
                一覧へ戻る
              </Link>
              <Link className="button-primary link-button" href={`/books/${book.id}/edit`}>
                編集
              </Link>
              <button
                className="button-danger"
                disabled={isDeleting}
                onClick={() => void handleDelete()}
                type="button"
              >
                {isDeleting ? "削除中..." : "削除"}
              </button>
            </div>
          </header>

          <section className="detail-section">
            <p className="eyebrow">Bibliography</p>
            <dl className="detail-grid">
              <DetailItem label="著者" value={book.author} />
              <DetailItem label="出版社" value={book.publisher} />
              <DetailItem label="出版日" value={book.publishedDate} />
              <DetailItem label="ISBN" value={book.isbn} />
            </dl>
          </section>

          <section className="detail-section">
            <p className="eyebrow">Barcodes</p>
            <dl className="detail-grid">
              <DetailItem label="本のバーコード" value={book.bookBarcode} />
              <DetailItem label="管理用バーコード" value={book.managementBarcode} />
              <DetailItem label="外部ソース" value={formatExternalSource(book.externalSource)} />
              <DetailItem label="外部ID" value={book.externalId} />
            </dl>
          </section>

          <section className="detail-section">
            <p className="eyebrow">Management</p>
            <dl className="detail-grid">
              <DetailItem label="保管場所" value={book.location?.name} />
              <DetailItem label="登録日時" value={formatDate(book.createdAt)} />
              <DetailItem label="更新日時" value={formatDate(book.updatedAt)} />
            </dl>
            <div className="book-tag-row detail-tags">
              {book.classificationTags.length > 0 ? (
                book.classificationTags.map((tag) => <span key={tag.id}>{tag.name}</span>)
              ) : (
                <span>分類なし</span>
              )}
            </div>
          </section>

          <section className="detail-section">
            <p className="eyebrow">Memo</p>
            <p className="memo-box">{book.managementMemo || "管理メモはありません。"}</p>
          </section>
        </article>
      ) : null}
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "-"}</dd>
    </div>
  );
}

function formatApiError(error: ApiError) {
  if (!error.errors?.length) {
    return error.message;
  }

  return `${error.message}: ${error.errors.map((item) => item.message).join(", ")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatExternalSource(source: string | null) {
  if (source === "ndl_search") {
    return "NDLサーチ";
  }

  return source === "open_library" ? "Open Library" : source;
}
