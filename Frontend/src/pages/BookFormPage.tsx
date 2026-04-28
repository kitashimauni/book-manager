import { type FormEvent, useEffect, useState } from "react";
import {
  createBook,
  createClassificationTag,
  getBook,
  getClassificationTags,
  getLocations,
  lookupBookByBarcode,
  updateBook,
  type ApiError,
  type Book,
  type BookFormRequest,
  type BookLookupResult,
  type ClassificationTag,
  type ClassificationTagSource,
  type Location
} from "../api/client.js";
import {
  CameraBarcodeScanner,
  type BarcodeScanTarget
} from "../components/CameraBarcodeScanner.js";
import { ErrorState, LoadingState } from "../components/StateBlocks.js";
import { navigateTo } from "../router.js";

type BookFormPageProps = {
  mode: "create" | "edit";
  bookId?: string;
};

type BookFormState = {
  author: string;
  bookBarcode: string;
  classificationTagIds: string[];
  externalId: string;
  externalSource: string;
  isbn: string;
  locationId: string;
  managementBarcode: string;
  managementMemo: string;
  publishedDate: string;
  publisher: string;
  title: string;
};

const emptyForm: BookFormState = {
  author: "",
  bookBarcode: "",
  classificationTagIds: [],
  externalId: "",
  externalSource: "",
  isbn: "",
  locationId: "",
  managementBarcode: "",
  managementMemo: "",
  publishedDate: "",
  publisher: "",
  title: ""
};

export function BookFormPage({ mode, bookId }: BookFormPageProps) {
  const isEdit = mode === "edit";
  const [candidateSource, setCandidateSource] = useState<ClassificationTagSource>("open_library");
  const [candidateSubjects, setCandidateSubjects] = useState<string[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [form, setForm] = useState<BookFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [tags, setTags] = useState<ClassificationTag[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoading(true);

      try {
        const [locationResult, tagResult, bookResult] = await Promise.all([
          getLocations(),
          getClassificationTags(),
          isEdit && bookId ? getBook(bookId) : Promise.resolve(null)
        ]);

        if (!isMounted) {
          return;
        }

        setLocations(locationResult.items);
        setTags(tagResult.items);

        if (bookResult) {
          setForm(bookToForm(bookResult));
        }

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

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [bookId, isEdit]);

  async function handleLookup() {
    const lookupValue = form.bookBarcode.trim() || form.isbn.trim();

    if (!lookupValue) {
      setLookupMessage("本のバーコードまたはISBNを入力してから照会してください。");
      return;
    }

    setIsLookupLoading(true);
    setLookupMessage(null);

    try {
      const result = await lookupBookByBarcode(lookupValue);
      applyLookupResult(result, lookupValue);
      setCandidateSource(result.externalSource);
      setCandidateSubjects(result.classificationTagCandidates);
      setLookupMessage(
        `${formatLookupSource(result.externalSource)}から取得した情報をフォームに反映しました。保存はまだ行われていません。`
      );
      setError(null);
    } catch (lookupError) {
      const apiError = lookupError as ApiError;

      if (apiError.status === 404 || apiError.status === 502) {
        setCandidateSource("open_library");
        setCandidateSubjects([]);
        setLookupMessage(`${apiError.message} 手入力で登録できます。`);
      } else {
        setError(apiError);
      }
    } finally {
      setIsLookupLoading(false);
    }
  }

  function applyLookupResult(result: BookLookupResult, lookupValue: string) {
    setForm((current) => ({
      ...current,
      author: result.author ?? current.author,
      bookBarcode: current.bookBarcode || lookupValue,
      externalId: result.externalId ?? current.externalId,
      externalSource: result.externalSource,
      isbn: result.isbn ?? current.isbn,
      publishedDate: result.publishedDate ?? current.publishedDate,
      publisher: result.publisher ?? current.publisher,
      title: result.title || current.title
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const payload = formToPayload(form);
      const savedBook = isEdit && bookId ? await updateBook(bookId, payload) : await createBook(payload);

      navigateTo(`/books/${savedBook.id}`);
    } catch (saveError) {
      setError(saveError as ApiError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCandidateSelect(candidate: string) {
    const existingTag = tags.find((tag) => tag.name.toLowerCase() === candidate.toLowerCase());

    if (existingTag) {
      if (!existingTag.isActive) {
        setLookupMessage(`「${candidate}」は無効化済みです。使う場合は分類タグ管理画面で再有効化してください。`);
        return;
      }

      selectTag(existingTag.id);
      return;
    }

    try {
      const createdTag = await createClassificationTag({
        name: candidate,
        source: candidateSource
      });

      setTags((current) => [...current, createdTag].sort((left, right) => left.name.localeCompare(right.name)));
      selectTag(createdTag.id);
      setError(null);
    } catch (candidateError) {
      setError(candidateError as ApiError);
    }
  }

  function selectTag(tagId: string) {
    setForm((current) => ({
      ...current,
      classificationTagIds: current.classificationTagIds.includes(tagId)
        ? current.classificationTagIds
        : [...current.classificationTagIds, tagId]
    }));
  }

  function toggleTag(tagId: string) {
    setForm((current) => ({
      ...current,
      classificationTagIds: current.classificationTagIds.includes(tagId)
        ? current.classificationTagIds.filter((id) => id !== tagId)
        : [...current.classificationTagIds, tagId]
    }));
  }

  function handleCameraScan(value: string, target: BarcodeScanTarget) {
    setForm((current) => ({
      ...current,
      [target]: value
    }));

    setLookupMessage(
      target === "bookBarcode"
        ? "カメラで読み取った値を本のバーコードに入力しました。必要に応じて外部APIで照会できます。"
        : "カメラで読み取った値を管理用バーコードに入力しました。"
    );
  }

  const activeLocations = locations.filter((location) => location.isActive || location.id === form.locationId);
  const activeTags = tags.filter((tag) => tag.isActive || form.classificationTagIds.includes(tag.id));

  return (
    <section className="page-panel">
      <div className="page-heading">
        <p className="eyebrow">{isEdit ? "Edit Book" : "New Book"}</p>
        <h2>{isEdit ? "本編集" : "本登録"}</h2>
        <p>
          本のバーコードと管理用バーコードを分けて扱います。外部API照会は入力補助で、取得した内容は保存前に確認できます。
        </p>
      </div>

      {error ? <ErrorState title="本の保存操作に失敗しました">{formatApiError(error)}</ErrorState> : null}

      {isLoading ? (
        <LoadingState title="フォームを読み込み中" />
      ) : (
        <form className="book-form-layout" onSubmit={handleSubmit}>
          <div className="book-form-main">
            <section className="form-section">
              <div>
                <p className="eyebrow">Bibliography</p>
                <h3>書誌情報</h3>
              </div>
              <label>
                <span>タイトル</span>
                <input
                  maxLength={200}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                  value={form.title}
                />
              </label>
              <label>
                <span>著者</span>
                <input
                  maxLength={500}
                  onChange={(event) => setForm({ ...form, author: event.target.value })}
                  placeholder="複数名はカンマ区切り"
                  value={form.author}
                />
              </label>
              <div className="field-pair">
                <label>
                  <span>出版社</span>
                  <input
                    maxLength={200}
                    onChange={(event) => setForm({ ...form, publisher: event.target.value })}
                    value={form.publisher}
                  />
                </label>
                <label>
                  <span>出版日</span>
                  <input
                    maxLength={50}
                    onChange={(event) => setForm({ ...form, publishedDate: event.target.value })}
                    placeholder="YYYY-MM-DD"
                    value={form.publishedDate}
                  />
                </label>
              </div>
              <label>
                <span>ISBN</span>
                <input
                  maxLength={200}
                  onChange={(event) => setForm({ ...form, isbn: event.target.value })}
                  value={form.isbn}
                />
              </label>
            </section>

            <section className="form-section">
              <div>
                <p className="eyebrow">Barcodes</p>
                <h3>バーコード</h3>
              </div>
              <div className="field-pair">
                <label>
                  <span>本のバーコード</span>
                  <input
                    maxLength={200}
                    onChange={(event) => setForm({ ...form, bookBarcode: event.target.value })}
                    placeholder="書籍自体のISBN/JANなど"
                    value={form.bookBarcode}
                  />
                </label>
                <label>
                  <span>管理用バーコード</span>
                  <input
                    maxLength={200}
                    onChange={(event) => setForm({ ...form, managementBarcode: event.target.value })}
                    placeholder="独自に貼付する管理番号"
                    value={form.managementBarcode}
                  />
                </label>
              </div>
              <div className="lookup-panel">
                <button className="button-secondary" disabled={isLookupLoading} onClick={() => void handleLookup()} type="button">
                  {isLookupLoading ? "照会中..." : "外部APIで照会"}
                </button>
                <p>
                  本のバーコードを優先し、未入力の場合はISBNで照会します。管理用バーコードは照会には使いません。
                </p>
                {lookupMessage ? <p className="inline-message">{lookupMessage}</p> : null}
              </div>
              <CameraBarcodeScanner onScan={handleCameraScan} />
            </section>

            <section className="form-section">
              <div>
                <p className="eyebrow">Management</p>
                <h3>管理情報</h3>
              </div>
              <label>
                <span>保管場所</span>
                <select
                  onChange={(event) => setForm({ ...form, locationId: event.target.value })}
                  value={form.locationId}
                >
                  <option value="">未設定</option>
                  {activeLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                      {location.isActive ? "" : "（無効）"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>管理メモ</span>
                <textarea
                  maxLength={5000}
                  onChange={(event) => setForm({ ...form, managementMemo: event.target.value })}
                  placeholder="破損、付属品、棚卸し補足など"
                  value={form.managementMemo}
                />
              </label>
            </section>
          </div>

          <aside className="book-form-side">
            <section className="form-section">
              <div>
                <p className="eyebrow">Classification</p>
                <h3>分類タグ</h3>
              </div>
              {activeTags.length === 0 ? (
                <p className="subtle-text">分類タグはまだありません。候補subjectから追加するか、分類タグ管理画面で作成できます。</p>
              ) : (
                <div className="choice-list">
                  {activeTags.map((tag) => (
                    <label className="choice-pill" key={tag.id}>
                      <input
                        checked={form.classificationTagIds.includes(tag.id)}
                        onChange={() => toggleTag(tag.id)}
                        type="checkbox"
                      />
                      <span>
                        {tag.name}
                        {tag.isActive ? "" : "（無効）"}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section className="form-section">
              <div>
                <p className="eyebrow">External Subjects</p>
                <h3>分類タグ候補</h3>
              </div>
              {candidateSubjects.length === 0 ? (
                <p className="subtle-text">照会でsubjectが取得できた場合、ここに候補として表示します。</p>
              ) : (
                <div className="candidate-list">
                  {candidateSubjects.map((candidate) => (
                    <button
                      className="candidate-chip"
                      key={candidate}
                      onClick={() => void handleCandidateSelect(candidate)}
                      type="button"
                    >
                      {candidate}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="form-section">
              <div>
                <p className="eyebrow">Save</p>
                <h3>保存</h3>
              </div>
              <button className="button-primary full-width" disabled={isSaving} type="submit">
                {isSaving ? "保存中..." : isEdit ? "更新する" : "登録する"}
              </button>
              <button className="button-secondary full-width" onClick={() => navigateTo("/books")} type="button">
                一覧へ戻る
              </button>
            </section>
          </aside>
        </form>
      )}
    </section>
  );
}

function bookToForm(book: Book): BookFormState {
  return {
    author: book.author ?? "",
    bookBarcode: book.bookBarcode ?? "",
    classificationTagIds: book.classificationTags.map((tag) => tag.id),
    externalId: book.externalId ?? "",
    externalSource: book.externalSource ?? "",
    isbn: book.isbn ?? "",
    locationId: book.location?.id ?? "",
    managementBarcode: book.managementBarcode ?? "",
    managementMemo: book.managementMemo ?? "",
    publishedDate: book.publishedDate ?? "",
    publisher: book.publisher ?? "",
    title: book.title
  };
}

function formToPayload(form: BookFormState): BookFormRequest {
  return {
    author: emptyToNull(form.author),
    bookBarcode: emptyToNull(form.bookBarcode),
    classificationTagIds: form.classificationTagIds,
    externalId: emptyToNull(form.externalId),
    externalSource: emptyToNull(form.externalSource),
    isbn: emptyToNull(form.isbn),
    locationId: form.locationId || null,
    managementBarcode: emptyToNull(form.managementBarcode),
    managementMemo: emptyToNull(form.managementMemo),
    publishedDate: emptyToNull(form.publishedDate),
    publisher: emptyToNull(form.publisher),
    title: form.title.trim()
  };
}

function emptyToNull(value: string) {
  return value.trim() || null;
}

function formatApiError(error: ApiError) {
  if (!error.errors?.length) {
    return error.message;
  }

  return `${error.message}: ${error.errors.map((item) => item.message).join(", ")}`;
}

function formatLookupSource(source: BookLookupResult["externalSource"]) {
  return source === "ndl_search" ? "NDLサーチ" : "Open Library";
}
