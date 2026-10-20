import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  createBook,
  createClassificationTag,
  createLocation,
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
import {
  focusFirstFieldError,
  formatFieldLabel,
  getFieldError,
  getFormErrorSummary
} from "../formErrors.js";
import {
  getBookIdentifierInputValue,
  getBookLookupValue,
  interpretBookIdentifier,
  mergeLookupIdentifiers
} from "../bookIdentifiers.js";
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

type InlineLocationFormState = {
  description: string;
  name: string;
};

const emptyInlineLocationForm: InlineLocationFormState = {
  description: "",
  name: ""
};

type InlineClassificationTagFormState = {
  description: string;
  name: string;
};

const emptyInlineClassificationTagForm: InlineClassificationTagFormState = {
  description: "",
  name: ""
};

export function BookFormPage({ mode, bookId }: BookFormPageProps) {
  const isEdit = mode === "edit";
  const [candidateSource, setCandidateSource] = useState<ClassificationTagSource>("open_library");
  const [candidateSubjects, setCandidateSubjects] = useState<string[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [form, setForm] = useState<BookFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [isInlineLocationOpen, setIsInlineLocationOpen] = useState(false);
  const [isInlineLocationSaving, setIsInlineLocationSaving] = useState(false);
  const [isInlineTagOpen, setIsInlineTagOpen] = useState(false);
  const [isInlineTagSaving, setIsInlineTagSaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inlineLocationError, setInlineLocationError] = useState<ApiError | null>(null);
  const [inlineLocationForm, setInlineLocationForm] = useState<InlineLocationFormState>(emptyInlineLocationForm);
  const [inlineLocationMessage, setInlineLocationMessage] = useState<string | null>(null);
  const [inlineTagError, setInlineTagError] = useState<ApiError | null>(null);
  const [inlineTagForm, setInlineTagForm] = useState<InlineClassificationTagFormState>(
    emptyInlineClassificationTagForm
  );
  const [inlineTagMessage, setInlineTagMessage] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [tags, setTags] = useState<ClassificationTag[]>([]);
  const inlineLocationNameInputRef = useRef<HTMLInputElement | null>(null);
  const inlineLocationSavingRef = useRef(false);
  const inlineLocationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const inlineTagNameInputRef = useRef<HTMLInputElement | null>(null);
  const inlineTagSavingRef = useRef(false);
  const inlineTagTriggerRef = useRef<HTMLButtonElement | null>(null);

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

  useEffect(() => {
    if (isInlineLocationOpen) {
      inlineLocationNameInputRef.current?.focus();
    }
  }, [isInlineLocationOpen]);

  useEffect(() => {
    if (isInlineLocationOpen && inlineLocationError && !isInlineLocationSaving) {
      inlineLocationNameInputRef.current?.focus();
    }
  }, [inlineLocationError, isInlineLocationOpen, isInlineLocationSaving]);

  useEffect(() => {
    if (isInlineTagOpen) {
      inlineTagNameInputRef.current?.focus();
    }
  }, [isInlineTagOpen]);

  useEffect(() => {
    if (isInlineTagOpen && inlineTagError && !isInlineTagSaving) {
      inlineTagNameInputRef.current?.focus();
    }
  }, [inlineTagError, isInlineTagOpen, isInlineTagSaving]);

  useEffect(() => {
    if (!isInlineTagOpen && !isInlineTagSaving && inlineTagMessage) {
      inlineTagTriggerRef.current?.focus();
    }
  }, [inlineTagMessage, isInlineTagOpen, isInlineTagSaving]);

  async function handleLookup() {
    const lookupValue = getBookLookupValue(form);

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
      externalId: result.externalId ?? current.externalId,
      externalSource: result.externalSource,
      publishedDate: result.publishedDate ?? current.publishedDate,
      publisher: result.publisher ?? current.publisher,
      title: result.title || current.title,
      ...mergeLookupIdentifiers(current, lookupValue, result.isbn)
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      isInlineLocationOpen ||
      inlineLocationSavingRef.current ||
      isInlineTagOpen ||
      inlineTagSavingRef.current
    ) {
      if (isInlineTagOpen || inlineTagSavingRef.current) {
        setInlineTagError({
          message: "分類タグの追加を保存またはキャンセルしてから、本を保存してください。",
          status: 400
        });
      } else {
        setInlineLocationError({
          message: "保管場所の追加を保存またはキャンセルしてから、本を保存してください。",
          status: 400
        });
      }
      return;
    }

    setIsSaving(true);

    try {
      const payload = formToPayload(form);
      const savedBook = isEdit && bookId ? await updateBook(bookId, payload) : await createBook(payload);

      navigateTo(`/books/${savedBook.id}`);
    } catch (saveError) {
      const apiError = saveError as ApiError;
      setError(apiError);
      focusFirstFieldError(apiError, "bookBarcode");
    } finally {
      setIsSaving(false);
    }
  }

  function openInlineLocationPanel() {
    if (inlineLocationSavingRef.current || isInlineTagOpen || isInlineTagSaving) {
      return;
    }

    setInlineLocationForm(emptyInlineLocationForm);
    setInlineLocationError(null);
    setInlineLocationMessage(null);
    setIsInlineLocationOpen(true);
  }

  function closeInlineLocationPanel() {
    if (inlineLocationSavingRef.current) {
      return;
    }

    setIsInlineLocationOpen(false);
    setInlineLocationForm(emptyInlineLocationForm);
    setInlineLocationError(null);
    inlineLocationTriggerRef.current?.focus();
  }

  async function handleInlineLocationSubmit() {
    if (inlineLocationSavingRef.current) {
      return;
    }

    const name = inlineLocationForm.name.trim();

    if (!name) {
      setInlineLocationError({
        errors: [{ field: "name", message: "保管場所名を入力してください。" }],
        message: "入力内容を確認してください。",
        status: 400
      });
      inlineLocationNameInputRef.current?.focus();
      return;
    }

    if (name.length > 200) {
      setInlineLocationError({
        errors: [{ field: "name", message: "保管場所名は200文字以内で入力してください。" }],
        message: "入力内容を確認してください。",
        status: 400
      });
      inlineLocationNameInputRef.current?.focus();
      return;
    }

    inlineLocationSavingRef.current = true;
    setIsInlineLocationSaving(true);
    setInlineLocationError(null);

    try {
      const createdLocation = await createLocation({
        description: inlineLocationForm.description.trim() || undefined,
        name,
        sortOrder: 0
      });

      setLocations((current) => [...current, createdLocation].sort(compareLocations));
      setForm((current) => ({ ...current, locationId: createdLocation.id }));
      setInlineLocationForm(emptyInlineLocationForm);
      setInlineLocationMessage(`保管場所「${createdLocation.name}」を追加し、この本に設定しました。`);
      setIsInlineLocationOpen(false);
      inlineLocationTriggerRef.current?.focus();
    } catch (locationSaveError) {
      setInlineLocationError(locationSaveError as ApiError);
    } finally {
      inlineLocationSavingRef.current = false;
      setIsInlineLocationSaving(false);
    }
  }

  function openInlineTagPanel() {
    if (inlineTagSavingRef.current || isInlineLocationOpen || isInlineLocationSaving) {
      return;
    }

    setInlineTagForm(emptyInlineClassificationTagForm);
    setInlineTagError(null);
    setInlineTagMessage(null);
    setIsInlineTagOpen(true);
  }

  function closeInlineTagPanel() {
    if (inlineTagSavingRef.current) {
      return;
    }

    setIsInlineTagOpen(false);
    setInlineTagForm(emptyInlineClassificationTagForm);
    setInlineTagError(null);
    inlineTagTriggerRef.current?.focus();
  }

  async function handleInlineTagSubmit() {
    if (inlineTagSavingRef.current) {
      return;
    }

    const name = inlineTagForm.name.trim();
    const existingTag = tags.find((tag) => normalizeTagName(tag.name) === normalizeTagName(name));

    if (!name) {
      setInlineTagError({
        errors: [{ field: "name", message: "分類タグ名を入力してください。" }],
        message: "入力内容を確認してください。",
        status: 400
      });
      inlineTagNameInputRef.current?.focus();
      return;
    }

    if (name.length > 200) {
      setInlineTagError({
        errors: [{ field: "name", message: "分類タグ名は200文字以内で入力してください。" }],
        message: "入力内容を確認してください。",
        status: 400
      });
      inlineTagNameInputRef.current?.focus();
      return;
    }

    if (existingTag) {
      if (!existingTag.isActive) {
        setInlineTagError({
          errors: [
            {
              field: "name",
              message: "同名の分類タグは無効化されています。分類タグ管理画面で再有効化してください。"
            }
          ],
          message: "無効化済みの分類タグは選択できません。",
          status: 409
        });
        return;
      }

      selectTag(existingTag.id);
      setInlineTagForm(emptyInlineClassificationTagForm);
      setInlineTagMessage(`同名の分類タグ「${existingTag.name}」を選択しました。`);
      setIsInlineTagOpen(false);
      return;
    }

    inlineTagSavingRef.current = true;
    setIsInlineTagSaving(true);
    setInlineTagError(null);

    try {
      const createdTag = await createClassificationTag({
        description: inlineTagForm.description.trim() || undefined,
        name,
        source: "manual"
      });

      setTags((current) => [...current, createdTag].sort((left, right) => left.name.localeCompare(right.name)));
      selectTag(createdTag.id);
      setInlineTagForm(emptyInlineClassificationTagForm);
      setInlineTagMessage(`分類タグ「${createdTag.name}」を追加し、この本に設定しました。`);
      setIsInlineTagOpen(false);
    } catch (tagSaveError) {
      const apiError = tagSaveError as ApiError;
      setInlineTagError(
        apiError.status === 409
          ? {
              ...apiError,
              message: "同名の分類タグが既に存在します。名前を変更するか、既存のタグを選択してください。"
            }
          : apiError
      );
    } finally {
      inlineTagSavingRef.current = false;
      setIsInlineTagSaving(false);
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
    if (target === "bookBarcode") {
      const interpreted = interpretBookIdentifier(value);

      setForm((current) => ({
        ...current,
        ...interpreted
      }));
      setLookupMessage(
        interpreted.isbn
          ? "カメラで読み取った値をISBNとして入力しました。必要に応じて外部APIで照会できます。"
          : "カメラで読み取った値を本のバーコードに入力しました。必要に応じて書誌情報を手入力できます。"
      );
      return;
    }

    setForm((current) => ({
      ...current,
      managementBarcode: value
    }));
    setLookupMessage("カメラで読み取った値を管理用バーコードに入力しました。");
  }

  const activeLocations = locations.filter((location) => location.isActive || location.id === form.locationId);
  const activeTags = tags.filter((tag) => tag.isActive || form.classificationTagIds.includes(tag.id));
  const bookBarcodeError = getFieldError(error, "bookBarcode");
  const isbnError = getFieldError(error, "isbn");
  const primaryIdentifierError = bookBarcodeError ?? isbnError;
  const hasDistinctIdentifierValues =
    Boolean(form.bookBarcode.trim()) &&
    Boolean(form.isbn.trim()) &&
    form.bookBarcode.trim() !== form.isbn.trim();
  const isBookSaveBlocked =
    isInlineLocationOpen ||
    isInlineLocationSaving ||
    isInlineTagOpen ||
    isInlineTagSaving;
  const bookSaveButtonLabel = isSaving
    ? "保存中..."
    : isInlineLocationSaving
      ? "保管場所を追加中..."
      : isInlineTagSaving
        ? "分類タグを追加中..."
        : isInlineLocationOpen
          ? "保管場所を確認中..."
          : isInlineTagOpen
            ? "分類タグを確認中..."
            : isEdit
              ? "更新する"
              : "登録する";

  return (
    <section className="page-panel">
      <div className="page-heading">
        <p className="eyebrow">{isEdit ? "Edit Book" : "New Book"}</p>
        <h2>{isEdit ? "本編集" : "本登録"}</h2>
        <p>
          本のバーコード / ISBNと管理用バーコードを分けて扱います。外部API照会は入力補助で、取得した内容は保存前に確認できます。
        </p>
      </div>

      {error ? (
        <ErrorState
          details={
            error.errors?.length ? (
              <ul className="field-error-list">
                {error.errors.map((item) => (
                  <li key={`${item.field}:${item.message}`}>
                    <a href={`#${item.field === "isbn" ? "bookBarcode" : item.field}`}>
                      {formatFieldLabel(item.field)}
                    </a>
                    <span>{item.message}</span>
                  </li>
                ))}
              </ul>
            ) : null
          }
          title="本の保存操作に失敗しました"
        >
          {getFormErrorSummary(error)}
        </ErrorState>
      ) : null}

      {isLoading ? (
        <LoadingState title="フォームを読み込み中" />
      ) : (
        <form className="book-form-layout" onSubmit={handleSubmit}>
          <ol className="registration-steps">
            <li>本のバーコード / ISBNを入力します。</li>
            <li>必要に応じてカメラで読み取り、読み取り結果の入力先を選びます。</li>
            <li>外部APIで照会し、書誌情報を確認・補正します。</li>
            <li>保管場所、分類タグ、管理情報を設定して保存します。</li>
          </ol>
          <div className="book-form-main">
            <section className="form-section barcode-section">
              <div>
                <p className="eyebrow">Barcodes</p>
                <h3>バーコード</h3>
              </div>
              <div className="field-pair">
                <label className={primaryIdentifierError ? "has-error" : undefined}>
                  <span>本のバーコード / ISBN</span>
                  <input
                    aria-describedby={primaryIdentifierError ? "bookIdentifier-error" : undefined}
                    aria-invalid={Boolean(primaryIdentifierError)}
                    id="bookBarcode"
                    maxLength={200}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        ...interpretBookIdentifier(event.target.value)
                      }))
                    }
                    placeholder="ISBN、JAN、その他のバーコード"
                    value={getBookIdentifierInputValue(form)}
                  />
                  <p className="field-help">
                    有効なISBN-10はISBNとして、有効なISBN-13は本のバーコードとISBNとして保存します。その他の値は本のバーコードとして保存します。外部APIで照会するときは、個別編集欄に有効なISBNがあればそれを優先します。
                  </p>
                  {primaryIdentifierError ? (
                    <p className="field-error" id="bookIdentifier-error">
                      {primaryIdentifierError}
                    </p>
                  ) : null}
                </label>
                <label className={getFieldError(error, "managementBarcode") ? "has-error" : undefined}>
                  <span>管理用バーコード</span>
                  <input
                    aria-describedby={getFieldError(error, "managementBarcode") ? "managementBarcode-error" : undefined}
                    aria-invalid={Boolean(getFieldError(error, "managementBarcode"))}
                    id="managementBarcode"
                    maxLength={200}
                    onChange={(event) => setForm({ ...form, managementBarcode: event.target.value })}
                    placeholder="独自に貼付する管理番号"
                    value={form.managementBarcode}
                  />
                  <p className="field-help">
                    利用者が貼付する蔵書管理用IDです。書誌情報の照会には使いません。
                  </p>
                  {getFieldError(error, "managementBarcode") ? (
                    <p className="field-error" id="managementBarcode-error">
                      {getFieldError(error, "managementBarcode")}
                    </p>
                  ) : null}
                </label>
              </div>
              <details className="identifier-details">
                <summary>
                  保存値を個別に編集
                  {hasDistinctIdentifierValues ? "（ISBNとバーコードが異なります）" : ""}
                </summary>
                <p className="field-help">
                  通常は上の入力から自動判定します。既存データなどで本のバーコードとISBNを別々に保持する場合は、ここで個別に編集できます。
                </p>
                <div className="field-pair">
                  <label className={bookBarcodeError ? "has-error" : undefined}>
                    <span>本のバーコード（保存値）</span>
                    <input
                      aria-describedby={bookBarcodeError ? "bookBarcode-details-error" : undefined}
                      aria-invalid={Boolean(bookBarcodeError)}
                      id="bookBarcode-details"
                      maxLength={200}
                      onChange={(event) => setForm({ ...form, bookBarcode: event.target.value })}
                      value={form.bookBarcode}
                    />
                    {bookBarcodeError ? (
                      <p className="field-error" id="bookBarcode-details-error">
                        {bookBarcodeError}
                      </p>
                    ) : null}
                  </label>
                  <label className={isbnError ? "has-error" : undefined}>
                    <span>ISBN（保存値）</span>
                    <input
                      aria-describedby={isbnError ? "isbn-error" : undefined}
                      aria-invalid={Boolean(isbnError)}
                      id="isbn-details"
                      maxLength={200}
                      onChange={(event) => setForm({ ...form, isbn: event.target.value })}
                      value={form.isbn}
                    />
                    {isbnError ? (
                      <p className="field-error" id="isbn-error">
                        {isbnError}
                      </p>
                    ) : null}
                  </label>
                </div>
              </details>
              <CameraBarcodeScanner onScan={handleCameraScan} />
              <div className="lookup-panel">
                <button
                  aria-busy={isLookupLoading}
                  className="button-secondary"
                  disabled={isLookupLoading}
                  onClick={() => void handleLookup()}
                  type="button"
                >
                  {isLookupLoading ? "照会中..." : "外部APIで照会"}
                </button>
                <p>
                  入力された値からISBNとして解釈できる値を使って照会します。個別編集欄に有効なISBNがある場合は、そのISBNを優先します。取得できない場合は下の書誌情報を手入力できます。
                </p>
                {lookupMessage ? <p className="inline-message">{lookupMessage}</p> : null}
              </div>
            </section>

            <section className="form-section bibliography-section">
              <div>
                <p className="eyebrow">Bibliography</p>
                <h3>書誌情報</h3>
              </div>
              <label className={getFieldError(error, "title") ? "has-error" : undefined}>
                <span>タイトル</span>
                <input
                  aria-describedby={getFieldError(error, "title") ? "title-error" : undefined}
                  aria-invalid={Boolean(getFieldError(error, "title"))}
                  id="title"
                  maxLength={200}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                  value={form.title}
                />
                {getFieldError(error, "title") ? (
                  <p className="field-error" id="title-error">
                    {getFieldError(error, "title")}
                  </p>
                ) : null}
              </label>
              <label className={getFieldError(error, "author") ? "has-error" : undefined}>
                <span>著者</span>
                <input
                  aria-describedby={getFieldError(error, "author") ? "author-error" : undefined}
                  aria-invalid={Boolean(getFieldError(error, "author"))}
                  id="author"
                  maxLength={500}
                  onChange={(event) => setForm({ ...form, author: event.target.value })}
                  placeholder="複数名はカンマ区切り"
                  value={form.author}
                />
                {getFieldError(error, "author") ? (
                  <p className="field-error" id="author-error">
                    {getFieldError(error, "author")}
                  </p>
                ) : null}
              </label>
              <div className="field-pair">
                <label className={getFieldError(error, "publisher") ? "has-error" : undefined}>
                  <span>出版社</span>
                  <input
                    aria-describedby={getFieldError(error, "publisher") ? "publisher-error" : undefined}
                    aria-invalid={Boolean(getFieldError(error, "publisher"))}
                    id="publisher"
                    maxLength={200}
                    onChange={(event) => setForm({ ...form, publisher: event.target.value })}
                    value={form.publisher}
                  />
                  {getFieldError(error, "publisher") ? (
                    <p className="field-error" id="publisher-error">
                      {getFieldError(error, "publisher")}
                    </p>
                  ) : null}
                </label>
                <label className={getFieldError(error, "publishedDate") ? "has-error" : undefined}>
                  <span>出版日</span>
                  <input
                    aria-describedby={getFieldError(error, "publishedDate") ? "publishedDate-error" : undefined}
                    aria-invalid={Boolean(getFieldError(error, "publishedDate"))}
                    id="publishedDate"
                    maxLength={50}
                    onChange={(event) => setForm({ ...form, publishedDate: event.target.value })}
                    placeholder="YYYY-MM-DD"
                    value={form.publishedDate}
                  />
                  {getFieldError(error, "publishedDate") ? (
                    <p className="field-error" id="publishedDate-error">
                      {getFieldError(error, "publishedDate")}
                    </p>
                  ) : null}
                </label>
              </div>
            </section>

            <section className="form-section management-section">
              <div>
                <p className="eyebrow">Management</p>
                <h3>管理情報</h3>
              </div>
              <div className={getFieldError(error, "locationId") ? "location-field has-error" : "location-field"}>
                <div className="field-label-row">
                  <label htmlFor="locationId">保管場所</label>
                  <button
                    className="button-secondary inline-add-button"
                    disabled={isInlineLocationSaving || isInlineTagOpen || isInlineTagSaving}
                    onClick={openInlineLocationPanel}
                    ref={inlineLocationTriggerRef}
                    type="button"
                  >
                    ＋保管場所を追加
                  </button>
                </div>
                <select
                  aria-describedby={getFieldError(error, "locationId") ? "locationId-error" : undefined}
                  aria-invalid={Boolean(getFieldError(error, "locationId"))}
                  id="locationId"
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
                {getFieldError(error, "locationId") ? (
                  <p className="field-error" id="locationId-error">
                    {getFieldError(error, "locationId")}
                  </p>
                ) : null}
                {inlineLocationMessage ? (
                  <p aria-live="polite" className="inline-message">
                    {inlineLocationMessage}
                  </p>
                ) : null}
                {isInlineLocationOpen ? (
                  <section
                    aria-labelledby="inline-location-title"
                    className="inline-location-panel"
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        closeInlineLocationPanel();
                      }
                    }}
                    role="dialog"
                  >
                    <div className="inline-location-heading">
                      <div>
                        <p className="eyebrow">New Location</p>
                        <h4 id="inline-location-title">保管場所を追加</h4>
                      </div>
                      <button
                        className="button-secondary"
                        disabled={isInlineLocationSaving}
                        onClick={closeInlineLocationPanel}
                        type="button"
                      >
                        キャンセル
                      </button>
                    </div>
                    <p className="subtle-text">
                      保存した保管場所は本の登録とは独立して保存されます。本の登録をキャンセルしても削除されません。
                    </p>
                    {inlineLocationError ? (
                      <div aria-live="assertive" className="inline-location-error" role="alert">
                        {inlineLocationError.errors?.length ? (
                          <p>入力内容を確認してください。</p>
                        ) : (
                          <p>{inlineLocationError.message}</p>
                        )}
                      </div>
                    ) : null}
                    <label>
                      <span>保管場所名</span>
                      <input
                        aria-describedby={
                          getFieldError(inlineLocationError, "name") ? "inline-location-name-error" : undefined
                        }
                        aria-invalid={Boolean(getFieldError(inlineLocationError, "name"))}
                        aria-required="true"
                        id="inline-location-name"
                        maxLength={200}
                        onChange={(event) =>
                          setInlineLocationForm((current) => ({ ...current, name: event.target.value }))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleInlineLocationSubmit();
                          }
                        }}
                        disabled={isInlineLocationSaving}
                        ref={inlineLocationNameInputRef}
                        value={inlineLocationForm.name}
                      />
                      {getFieldError(inlineLocationError, "name") ? (
                        <p className="field-error" id="inline-location-name-error">
                          {getFieldError(inlineLocationError, "name")}
                        </p>
                      ) : null}
                    </label>
                    <label>
                      <span>説明（任意）</span>
                      <textarea
                        maxLength={1000}
                        onChange={(event) =>
                          setInlineLocationForm((current) => ({ ...current, description: event.target.value }))
                        }
                        disabled={isInlineLocationSaving}
                        value={inlineLocationForm.description}
                      />
                    </label>
                    <div className="form-actions">
                      <button
                        aria-busy={isInlineLocationSaving}
                        className="button-primary"
                        disabled={isInlineLocationSaving}
                        onClick={() => void handleInlineLocationSubmit()}
                        type="button"
                      >
                        {isInlineLocationSaving ? "追加中..." : "保管場所を保存"}
                      </button>
                      <button
                        className="button-secondary"
                        disabled={isInlineLocationSaving}
                        onClick={closeInlineLocationPanel}
                        type="button"
                      >
                        キャンセル
                      </button>
                    </div>
                  </section>
                ) : null}
              </div>
              <label className={getFieldError(error, "managementMemo") ? "has-error" : undefined}>
                <span>管理メモ</span>
                <textarea
                  aria-describedby={getFieldError(error, "managementMemo") ? "managementMemo-error" : undefined}
                  aria-invalid={Boolean(getFieldError(error, "managementMemo"))}
                  id="managementMemo"
                  maxLength={5000}
                  onChange={(event) => setForm({ ...form, managementMemo: event.target.value })}
                  placeholder="破損、付属品、棚卸し補足など"
                  value={form.managementMemo}
                />
                {getFieldError(error, "managementMemo") ? (
                  <p className="field-error" id="managementMemo-error">
                    {getFieldError(error, "managementMemo")}
                  </p>
                ) : null}
              </label>
            </section>

          </div>

          <aside className="book-form-side">
            <section className="form-section" id="classificationTagIds" tabIndex={-1}>
              <div className="field-label-row">
                <div>
                  <p className="eyebrow">Classification</p>
                  <h3>分類タグ</h3>
                </div>
                <button
                  className="button-secondary inline-add-button"
                  disabled={isInlineTagSaving || isInlineLocationOpen || isInlineLocationSaving}
                  onClick={openInlineTagPanel}
                  ref={inlineTagTriggerRef}
                  type="button"
                >
                  ＋分類タグを追加
                </button>
              </div>
              {inlineTagMessage ? (
                <p aria-live="polite" className="inline-message">
                  {inlineTagMessage}
                </p>
              ) : null}
              {isInlineTagOpen ? (
                <section
                  aria-labelledby="inline-classification-tag-title"
                  className="inline-location-panel"
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      closeInlineTagPanel();
                    }
                  }}
                  role="dialog"
                >
                  <div className="inline-location-heading">
                    <div>
                      <p className="eyebrow">New Classification</p>
                      <h4 id="inline-classification-tag-title">分類タグを追加</h4>
                    </div>
                    <button
                      className="button-secondary"
                      disabled={isInlineTagSaving}
                      onClick={closeInlineTagPanel}
                      type="button"
                    >
                      キャンセル
                    </button>
                  </div>
                  <p className="subtle-text">
                    保存した分類タグは本の登録とは独立して保存されます。本の登録をキャンセルしても削除されません。
                  </p>
                  {inlineTagError ? (
                    <div aria-live="assertive" className="inline-location-error" role="alert">
                      {inlineTagError.errors?.length ? (
                        <p>入力内容を確認してください。</p>
                      ) : (
                        <p>{inlineTagError.message}</p>
                      )}
                    </div>
                  ) : null}
                  <label>
                    <span>分類タグ名</span>
                    <input
                      aria-describedby={getFieldError(inlineTagError, "name") ? "inline-tag-name-error" : undefined}
                      aria-invalid={Boolean(getFieldError(inlineTagError, "name"))}
                      aria-required="true"
                      disabled={isInlineTagSaving}
                      id="inline-classification-tag-name"
                      maxLength={200}
                      onChange={(event) =>
                        setInlineTagForm((current) => ({ ...current, name: event.target.value }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleInlineTagSubmit();
                        }
                      }}
                      ref={inlineTagNameInputRef}
                      value={inlineTagForm.name}
                    />
                    {getFieldError(inlineTagError, "name") ? (
                      <p className="field-error" id="inline-tag-name-error">
                        {getFieldError(inlineTagError, "name")}
                      </p>
                    ) : null}
                  </label>
                  <label>
                    <span>説明（任意）</span>
                    <textarea
                      disabled={isInlineTagSaving}
                      maxLength={1000}
                      onChange={(event) =>
                        setInlineTagForm((current) => ({ ...current, description: event.target.value }))
                      }
                      value={inlineTagForm.description}
                    />
                  </label>
                  <div className="form-actions">
                    <button
                      aria-busy={isInlineTagSaving}
                      className="button-primary"
                      disabled={isInlineTagSaving}
                      onClick={() => void handleInlineTagSubmit()}
                      type="button"
                    >
                      {isInlineTagSaving ? "追加中..." : "分類タグを保存"}
                    </button>
                    <button
                      className="button-secondary"
                      disabled={isInlineTagSaving}
                      onClick={closeInlineTagPanel}
                      type="button"
                    >
                      キャンセル
                    </button>
                  </div>
                </section>
              ) : null}
              {activeTags.length === 0 ? (
                <p className="subtle-text">分類タグはまだありません。候補subjectやNDC9分類から追加するか、分類タグ管理画面で作成できます。</p>
              ) : (
                <div className="choice-list">
                  {activeTags.map((tag) => (
                    <label
                      className={form.classificationTagIds.includes(tag.id) ? "choice-pill selected" : "choice-pill"}
                      key={tag.id}
                    >
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
              {getFieldError(error, "classificationTagIds") ? (
                <p className="field-error" id="classificationTagIds-error">
                  {getFieldError(error, "classificationTagIds")}
                </p>
              ) : null}
            </section>

            <section className="form-section">
              <div>
                <p className="eyebrow">External Subjects</p>
                <h3>分類タグ候補</h3>
              </div>
              {candidateSubjects.length === 0 ? (
                <p className="subtle-text">照会でsubject、genre、NDC9分類名が取得できた場合、ここに候補として表示します。</p>
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

          </aside>

          <section
            aria-label={isEdit ? "本の更新操作" : "本の登録操作"}
            className="form-action-section"
          >
            <div className="form-actions">
              <button
                aria-busy={isSaving || isInlineLocationSaving || isInlineTagSaving}
                className="button-primary"
                disabled={isSaving || isBookSaveBlocked}
                type="submit"
              >
                {bookSaveButtonLabel}
              </button>
              <button
                className="button-secondary"
                disabled={isInlineLocationSaving || isInlineTagSaving}
                onClick={() => navigateTo("/books")}
                type="button"
              >
                一覧へ戻る
              </button>
            </div>
          </section>
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

function compareLocations(left: Location, right: Location) {
  return left.sortOrder - right.sortOrder || left.name.localeCompare(right.name);
}

function normalizeTagName(value: string) {
  return value.trim().toLocaleLowerCase();
}

function formatLookupSource(source: BookLookupResult["externalSource"]) {
  return source === "ndl_search" ? "NDLサーチ" : "Open Library";
}
