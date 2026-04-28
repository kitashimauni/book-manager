import { type FormEvent, useEffect, useState } from "react";
import {
  deleteBook,
  getBooks,
  getClassificationTags,
  getLocations,
  type ApiError,
  type Book,
  type ClassificationTag,
  type Location
} from "../api/client.js";
import { Link } from "../components/Link.js";
import { EmptyState, ErrorState, LoadingState } from "../components/StateBlocks.js";

const pageSize = 20;

type SearchState = {
  classificationTagId: string;
  locationId: string;
  q: string;
};

const emptySearch: SearchState = {
  classificationTagId: "",
  locationId: "",
  q: ""
};

export function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [filters, setFilters] = useState<SearchState>(emptySearch);
  const [locations, setLocations] = useState<Location[]>([]);
  const [page, setPage] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState<SearchState>(emptySearch);
  const [tags, setTags] = useState<ClassificationTag[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadFilterOptions() {
      try {
        const [locationResult, tagResult] = await Promise.all([getLocations(), getClassificationTags()]);

        if (!isMounted) {
          return;
        }

        setLocations(locationResult.items);
        setTags(tagResult.items);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError as ApiError);
        }
      }
    }

    void loadFilterOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadBooks() {
      setIsLoading(true);

      try {
        const result = await getBooks({
          classificationTagId: filters.classificationTagId || undefined,
          limit: pageSize,
          locationId: filters.locationId || undefined,
          page,
          q: filters.q.trim() || undefined
        });

        if (!isMounted) {
          return;
        }

        setBooks(result.items);
        setTotal(result.total);
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

    void loadBooks();

    return () => {
      isMounted = false;
    };
  }, [filters, page, reloadKey]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFilters(search);
  }

  function handleFilterChange(nextSearch: SearchState) {
    setSearch(nextSearch);
    setFilters(nextSearch);
    setPage(1);
  }

  async function handleDelete(book: Book) {
    if (!window.confirm(`「${book.title}」を削除しますか？この操作は元に戻せません。`)) {
      return;
    }

    setPendingDeleteId(book.id);

    try {
      await deleteBook(book.id);

      if (books.length === 1 && page > 1) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        setReloadKey((current) => current + 1);
      }

      setError(null);
    } catch (deleteError) {
      setError(deleteError as ApiError);
    } finally {
      setPendingDeleteId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasActiveFilters = Boolean(filters.q || filters.locationId || filters.classificationTagId);

  return (
    <section className="page-panel">
      <div className="page-heading">
        <p className="eyebrow">Books</p>
        <h2>本一覧</h2>
        <p>タイトル、著者、ISBN、本のバーコード、管理用バーコードから探せます。保管場所と分類タグでも絞り込めます。</p>
      </div>

      {error ? <ErrorState title="本一覧の取得に失敗しました">{formatApiError(error)}</ErrorState> : null}

      <section className="book-list-toolbar" aria-label="本の検索条件">
        <form className="book-search-form" onSubmit={handleSearchSubmit}>
          <label>
            <span>キーワード</span>
            <input
              onChange={(event) => setSearch({ ...search, q: event.target.value })}
              placeholder="タイトル、著者、ISBN、バーコード"
              value={search.q}
            />
          </label>
          <button className="button-primary" type="submit">
            検索
          </button>
        </form>

        <div className="filter-row">
          <label>
            <span>保管場所</span>
            <select
              onChange={(event) => handleFilterChange({ ...search, locationId: event.target.value })}
              value={search.locationId}
            >
              <option value="">すべて</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                  {location.isActive ? "" : "（無効）"}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>分類タグ</span>
            <select
              onChange={(event) =>
                handleFilterChange({ ...search, classificationTagId: event.target.value })
              }
              value={search.classificationTagId}
            >
              <option value="">すべて</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                  {tag.isActive ? "" : "（無効）"}
                </option>
              ))}
            </select>
          </label>

          <button
            className="button-secondary"
            onClick={() => {
              setSearch(emptySearch);
              setFilters(emptySearch);
              setPage(1);
            }}
            type="button"
          >
            条件をクリア
          </button>

          <Link className="button-primary link-button" href="/books/new">
            本を登録
          </Link>
        </div>
      </section>

      <div className="result-summary">
        <strong>{total}</strong>
        <span>冊</span>
        {hasActiveFilters ? <span>現在の条件で絞り込み中</span> : <span>登録済みの本</span>}
      </div>

      {isLoading ? <LoadingState title="本を読み込み中" /> : null}

      {!isLoading && books.length === 0 && !hasActiveFilters ? (
        <EmptyState title="まだ本が登録されていません">
          まずは本登録画面から、バーコード照会または手入力で1冊追加してみましょう。
        </EmptyState>
      ) : null}

      {!isLoading && books.length === 0 && hasActiveFilters ? (
        <EmptyState title="条件に一致する本がありません">
          検索語、保管場所、分類タグの条件を少し広げると見つかるかもしれません。
        </EmptyState>
      ) : null}

      {!isLoading && books.length > 0 ? (
        <>
          <div className="book-card-list">
            {books.map((book) => (
              <BookCard
                book={book}
                isDeleting={pendingDeleteId === book.id}
                key={book.id}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <div className="pagination-bar">
            <button
              className="button-secondary"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              前へ
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              className="button-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              type="button"
            >
              次へ
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function BookCard({
  book,
  isDeleting,
  onDelete
}: {
  book: Book;
  isDeleting: boolean;
  onDelete: (book: Book) => void;
}) {
  return (
    <article className="book-card">
      <div>
        <p className="eyebrow">{book.location?.name ?? "No Location"}</p>
        <h3>
          <Link href={`/books/${book.id}`}>{book.title}</Link>
        </h3>
        <p>{book.author || "著者未設定"}</p>
      </div>
      <dl className="book-meta-grid">
        <div>
          <dt>ISBN</dt>
          <dd>{book.isbn || "-"}</dd>
        </div>
        <div>
          <dt>本のバーコード</dt>
          <dd>{book.bookBarcode || "-"}</dd>
        </div>
        <div>
          <dt>管理用バーコード</dt>
          <dd>{book.managementBarcode || "-"}</dd>
        </div>
        <div>
          <dt>更新</dt>
          <dd>{formatDate(book.updatedAt)}</dd>
        </div>
      </dl>
      <div className="book-tag-row">
        {book.classificationTags.length > 0 ? (
          book.classificationTags.map((tag) => <span key={tag.id}>{tag.name}</span>)
        ) : (
          <span>分類なし</span>
        )}
      </div>
      <div className="card-actions">
        <Link className="button-secondary link-button" href={`/books/${book.id}`}>
          詳細
        </Link>
        <Link className="button-secondary link-button" href={`/books/${book.id}/edit`}>
          編集
        </Link>
        <button
          className="button-danger"
          disabled={isDeleting}
          onClick={() => onDelete(book)}
          type="button"
        >
          {isDeleting ? "削除中..." : "削除"}
        </button>
      </div>
    </article>
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
