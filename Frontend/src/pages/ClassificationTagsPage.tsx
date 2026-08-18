import { type FormEvent, useEffect, useState } from "react";
import {
  createClassificationTag,
  disableClassificationTag,
  getClassificationTags,
  updateClassificationTag,
  type ApiError,
  type ClassificationTag,
  type ClassificationTagSource
} from "../api/client.js";
import { EmptyState, ErrorState, LoadingState } from "../components/StateBlocks.js";
import {
  focusFirstFieldError,
  formatFieldLabel,
  getFieldError,
  getFormErrorSummary
} from "../formErrors.js";

type ClassificationTagFormState = {
  description: string;
  isActive: boolean;
  name: string;
  source: ClassificationTagSource;
};

const emptyForm: ClassificationTagFormState = {
  description: "",
  isActive: true,
  name: "",
  source: "manual"
};

export function ClassificationTagsPage() {
  const [editingTag, setEditingTag] = useState<ClassificationTag | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [form, setForm] = useState<ClassificationTagFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [tags, setTags] = useState<ClassificationTag[]>([]);

  async function loadTags() {
    setIsLoading(true);

    try {
      const result = await getClassificationTags();
      setTags(result.items);
      setError(null);
    } catch (loadError) {
      setError(loadError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTags();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const payload = {
      description: form.description.trim() || undefined,
      name: form.name.trim(),
      source: form.source
    };

    try {
      if (editingTag) {
        await updateClassificationTag(editingTag.id, {
          ...payload,
          description: form.description.trim() || null,
          isActive: form.isActive
        });
      } else {
        await createClassificationTag(payload);
      }

      resetForm();
      await loadTags();
    } catch (saveError) {
      const apiError = saveError as ApiError;
      setError(apiError);
      focusFirstFieldError(apiError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisable(tag: ClassificationTag) {
    if (!window.confirm(`「${tag.name}」を無効化しますか？`)) {
      return;
    }

    setPendingId(tag.id);

    try {
      await disableClassificationTag(tag.id);
      await loadTags();
    } catch (disableError) {
      setError(disableError as ApiError);
    } finally {
      setPendingId(null);
    }
  }

  async function handleRestore(tag: ClassificationTag) {
    setPendingId(tag.id);

    try {
      await updateClassificationTag(tag.id, { isActive: true });
      await loadTags();
    } catch (restoreError) {
      setError(restoreError as ApiError);
    } finally {
      setPendingId(null);
    }
  }

  function startEdit(tag: ClassificationTag) {
    setEditingTag(tag);
    setForm({
      description: tag.description ?? "",
      isActive: tag.isActive,
      name: tag.name,
      source: tag.source
    });
  }

  function resetForm() {
    setEditingTag(null);
    setForm(emptyForm);
  }

  return (
    <section className="page-panel">
      <div className="page-heading">
        <p className="eyebrow">Classification Tags</p>
        <h2>分類タグ管理</h2>
        <p>
          分類タグを手入力で登録します。外部APIのsubjectから確定したタグも同じ一覧で管理し、本の登録・編集時に複数選択できるようにします。
        </p>
      </div>

      {error ? (
        <ErrorState
          details={
            error.errors?.length ? (
              <ul className="field-error-list">
                {error.errors.map((item) => (
                  <li key={`${item.field}:${item.message}`}>
                    <a href={`#${item.field}`}>{formatFieldLabel(item.field)}</a>
                    <span>{item.message}</span>
                  </li>
                ))}
              </ul>
            ) : null
          }
          title="分類タグの操作に失敗しました"
        >
          {getFormErrorSummary(error)}
        </ErrorState>
      ) : null}

      <div className="management-grid">
        <form className="management-form" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">{editingTag ? "Edit Tag" : "New Tag"}</p>
            <h3>{editingTag ? "分類タグを編集" : "分類タグを追加"}</h3>
          </div>

          <label className={getFieldError(error, "name") ? "has-error" : undefined}>
            <span>分類タグ名</span>
            <input
              aria-describedby={getFieldError(error, "name") ? "tag-name-error" : undefined}
              aria-invalid={Boolean(getFieldError(error, "name"))}
              id="name"
              maxLength={200}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="例: Software Engineering"
              required
              value={form.name}
            />
            {getFieldError(error, "name") ? (
              <p className="field-error" id="tag-name-error">
                {getFieldError(error, "name")}
              </p>
            ) : null}
          </label>

          <label className={getFieldError(error, "description") ? "has-error" : undefined}>
            <span>説明</span>
            <textarea
              aria-describedby={getFieldError(error, "description") ? "tag-description-error" : undefined}
              aria-invalid={Boolean(getFieldError(error, "description"))}
              id="description"
              maxLength={1000}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="分類の基準や補足など"
              value={form.description}
            />
            {getFieldError(error, "description") ? (
              <p className="field-error" id="tag-description-error">
                {getFieldError(error, "description")}
              </p>
            ) : null}
          </label>

          <label className={getFieldError(error, "source") ? "has-error" : undefined}>
            <span>由来</span>
            <select
              aria-describedby={getFieldError(error, "source") ? "source-error" : undefined}
              aria-invalid={Boolean(getFieldError(error, "source"))}
              id="source"
              onChange={(event) =>
                setForm({ ...form, source: event.target.value as ClassificationTagSource })
              }
              value={form.source}
            >
              <option value="manual">手入力</option>
              <option value="ndl_search">NDLサーチ</option>
              <option value="open_library">Open Library</option>
            </select>
            {getFieldError(error, "source") ? (
              <p className="field-error" id="source-error">
                {getFieldError(error, "source")}
              </p>
            ) : null}
          </label>

          {editingTag ? (
            <label className="checkbox-field">
              <input
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                type="checkbox"
              />
              <span>本登録・編集で選択できる状態にする</span>
            </label>
          ) : null}

          <div className="form-actions">
            <button className="button-primary" disabled={isSaving} type="submit">
              {isSaving ? "保存中..." : editingTag ? "更新する" : "追加する"}
            </button>
            {editingTag ? (
              <button className="button-secondary" onClick={resetForm} type="button">
                キャンセル
              </button>
            ) : null}
          </div>
        </form>

        <div className="management-list">
          <div className="list-heading">
            <div>
              <p className="eyebrow">Saved Tags</p>
              <h3>登録済み分類タグ</h3>
            </div>
            <button className="button-secondary" onClick={() => void loadTags()} type="button">
              再読み込み
            </button>
          </div>

          {isLoading ? <LoadingState title="分類タグを読み込み中" /> : null}

          {!isLoading && tags.length === 0 ? (
            <EmptyState
              actions={
                <button className="button-primary" onClick={() => focusField("name")} type="button">
                  最初の分類タグを追加
                </button>
              }
              title="分類タグがまだありません"
            >
              分類タグはあとから追加できます。外部APIから取得したsubjectも、確定したものだけ保存します。
            </EmptyState>
          ) : null}

          {!isLoading && tags.length > 0 ? (
            <div className="tag-card-list">
              {tags.map((tag) => (
                <article className={tag.isActive ? "tag-card" : "tag-card inactive"} key={tag.id}>
                  <div>
                    <div className="tag-card-title">
                      <h4>{tag.name}</h4>
                      <span className={tag.isActive ? "status-pill active" : "status-pill"}>
                        {tag.isActive ? "有効" : "無効"}
                      </span>
                    </div>
                    <p>{tag.description || "説明なし"}</p>
                    <dl className="meta-list">
                      <div>
                        <dt>由来</dt>
                        <dd>{formatSource(tag.source)}</dd>
                      </div>
                      <div>
                        <dt>更新</dt>
                        <dd>{formatDate(tag.updatedAt)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="card-actions">
                    <button className="button-secondary" onClick={() => startEdit(tag)} type="button">
                      編集
                    </button>
                    {tag.isActive ? (
                      <button
                        className="button-danger"
                        disabled={pendingId === tag.id}
                        onClick={() => void handleDisable(tag)}
                        type="button"
                      >
                        無効化
                      </button>
                    ) : (
                      <button
                        className="button-secondary"
                        disabled={pendingId === tag.id}
                        onClick={() => void handleRestore(tag)}
                        type="button"
                      >
                        再有効化
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function focusField(id: string) {
  document.getElementById(id)?.focus();
}

function formatSource(source: ClassificationTagSource) {
  if (source === "ndl_search") {
    return "NDLサーチ";
  }

  return source === "open_library" ? "Open Library" : "手入力";
}
