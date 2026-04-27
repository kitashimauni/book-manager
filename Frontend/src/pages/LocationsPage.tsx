import { type FormEvent, useEffect, useState } from "react";
import {
  createLocation,
  disableLocation,
  getLocations,
  updateLocation,
  type ApiError,
  type Location
} from "../api/client.js";
import { EmptyState, ErrorState, LoadingState } from "../components/StateBlocks.js";

type LocationFormState = {
  description: string;
  isActive: boolean;
  name: string;
  sortOrder: string;
};

const emptyForm: LocationFormState = {
  description: "",
  isActive: true,
  name: "",
  sortOrder: "0"
};

export function LocationsPage() {
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [form, setForm] = useState<LocationFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function loadLocations() {
    setIsLoading(true);

    try {
      const result = await getLocations();
      setLocations(result.items);
      setError(null);
    } catch (loadError) {
      setError(loadError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadLocations();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    const sortOrder = Number.parseInt(form.sortOrder, 10);
    const payload = {
      description: form.description.trim() || undefined,
      name: form.name.trim(),
      sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder
    };

    try {
      if (editingLocation) {
        await updateLocation(editingLocation.id, {
          ...payload,
          description: form.description.trim() || null,
          isActive: form.isActive
        });
      } else {
        await createLocation(payload);
      }

      resetForm();
      await loadLocations();
    } catch (saveError) {
      setError(saveError as ApiError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisable(location: Location) {
    if (!window.confirm(`「${location.name}」を無効化しますか？`)) {
      return;
    }

    setPendingId(location.id);

    try {
      await disableLocation(location.id);
      await loadLocations();
    } catch (disableError) {
      setError(disableError as ApiError);
    } finally {
      setPendingId(null);
    }
  }

  async function handleRestore(location: Location) {
    setPendingId(location.id);

    try {
      await updateLocation(location.id, { isActive: true });
      await loadLocations();
    } catch (restoreError) {
      setError(restoreError as ApiError);
    } finally {
      setPendingId(null);
    }
  }

  function startEdit(location: Location) {
    setEditingLocation(location);
    setForm({
      description: location.description ?? "",
      isActive: location.isActive,
      name: location.name,
      sortOrder: String(location.sortOrder)
    });
  }

  function resetForm() {
    setEditingLocation(null);
    setForm(emptyForm);
  }

  return (
    <section className="page-panel">
      <div className="page-heading">
        <p className="eyebrow">Locations</p>
        <h2>保管場所管理</h2>
        <p>
          本棚、部屋、研究室の棚などを事前に登録します。使わなくなった場所は削除せず無効化し、既存の本との紐づきを残します。
        </p>
      </div>

      {error ? (
        <ErrorState title="保管場所の操作に失敗しました">{formatApiError(error)}</ErrorState>
      ) : null}

      <div className="management-grid">
        <form className="management-form" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">{editingLocation ? "Edit Location" : "New Location"}</p>
            <h3>{editingLocation ? "保管場所を編集" : "保管場所を追加"}</h3>
          </div>

          <label>
            <span>保管場所名</span>
            <input
              maxLength={200}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="例: 研究室 A 棚"
              required
              value={form.name}
            />
          </label>

          <label>
            <span>説明</span>
            <textarea
              maxLength={1000}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="棚番号や補足など"
              value={form.description}
            />
          </label>

          <label>
            <span>表示順</span>
            <input
              min={0}
              onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
              type="number"
              value={form.sortOrder}
            />
          </label>

          {editingLocation ? (
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
              {isSaving ? "保存中..." : editingLocation ? "更新する" : "追加する"}
            </button>
            {editingLocation ? (
              <button className="button-secondary" onClick={resetForm} type="button">
                キャンセル
              </button>
            ) : null}
          </div>
        </form>

        <div className="management-list">
          <div className="list-heading">
            <div>
              <p className="eyebrow">Saved Locations</p>
              <h3>登録済み保管場所</h3>
            </div>
            <button className="button-secondary" onClick={() => void loadLocations()} type="button">
              再読み込み
            </button>
          </div>

          {isLoading ? <LoadingState title="保管場所を読み込み中" /> : null}

          {!isLoading && locations.length === 0 ? (
            <EmptyState title="保管場所がまだありません">
              本を登録する前に、よく使う本棚や部屋を追加しておくと入力が楽になります。
            </EmptyState>
          ) : null}

          {!isLoading && locations.length > 0 ? (
            <div className="tag-card-list">
              {locations.map((location) => (
                <article className={location.isActive ? "tag-card" : "tag-card inactive"} key={location.id}>
                  <div>
                    <div className="tag-card-title">
                      <h4>{location.name}</h4>
                      <span className={location.isActive ? "status-pill active" : "status-pill"}>
                        {location.isActive ? "有効" : "無効"}
                      </span>
                    </div>
                    <p>{location.description || "説明なし"}</p>
                    <dl className="meta-list">
                      <div>
                        <dt>表示順</dt>
                        <dd>{location.sortOrder}</dd>
                      </div>
                      <div>
                        <dt>更新</dt>
                        <dd>{formatDate(location.updatedAt)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="card-actions">
                    <button className="button-secondary" onClick={() => startEdit(location)} type="button">
                      編集
                    </button>
                    {location.isActive ? (
                      <button
                        className="button-danger"
                        disabled={pendingId === location.id}
                        onClick={() => void handleDisable(location)}
                        type="button"
                      >
                        無効化
                      </button>
                    ) : (
                      <button
                        className="button-secondary"
                        disabled={pendingId === location.id}
                        onClick={() => void handleRestore(location)}
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
