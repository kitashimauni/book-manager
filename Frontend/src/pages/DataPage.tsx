import { type ChangeEvent, useState } from "react";
import {
  exportJsonData,
  importJsonData,
  previewJsonImport,
  type ApiError,
  type ImportAction,
  type ImportConflict,
  type ImportPreview,
  type ImportResult,
  type JsonExportPayload
} from "../api/client.js";
import { ErrorState } from "../components/StateBlocks.js";
import { focusFirstFieldError, getFormErrorSummary } from "../formErrors.js";

type ConflictActions = Record<string, ImportAction>;

export function DataPage() {
  const [conflictActions, setConflictActions] = useState<ConflictActions>({});
  const [defaultAction, setDefaultAction] = useState<ImportAction>("skip");
  const [error, setError] = useState<ApiError | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [importPayload, setImportPayload] = useState<JsonExportPayload | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [importSource, setImportSource] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  async function handleExport() {
    setIsExporting(true);
    setExportMessage(null);
    setError(null);

    try {
      const payload = await exportJsonData();
      downloadJson(payload);
      setExportMessage("JSON Exportを作成しました。復元や移行にはこのJSONを使います。");
    } catch (exportError) {
      setError(exportError as ApiError);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    clearImportReview();
    setJsonText("");

    try {
      const text = await file.text();
      setJsonText(text);
      await previewText(text, `ファイル: ${file.name}`);
    } catch (fileError) {
      const apiError = createFileReadError(fileError);
      setError(apiError);
      focusFirstFieldError(apiError, "json-import");
    } finally {
      event.target.value = "";
    }
  }

  async function handlePreview() {
    await previewText(jsonText, "JSON貼り付け");
  }

  async function previewText(text: string, source: string) {
    clearImportReview();

    if (!text.trim()) {
      setError({
        message: "ImportするJSONを選択または貼り付けてください。",
        status: 400
      });
      return;
    }

    let parsed: JsonExportPayload;

    try {
      parsed = JSON.parse(text) as JsonExportPayload;
    } catch {
      setError({
        message: "JSONとして読み取れませんでした。ファイル内容を確認してください。",
        status: 400
      });
      return;
    }

    setIsPreviewing(true);

    try {
      const result = await previewJsonImport(parsed);
      setImportPayload(parsed);
      setPreview(result);
      setImportSource(source);
      setDefaultAction("skip");
      setConflictActions(createInitialConflictActions(result.conflicts, "skip"));
    } catch (previewError) {
      const apiError = previewError as ApiError;
      setError(apiError);
      focusFirstFieldError(apiError, "json-import");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function handleImport() {
    if (!importPayload || !preview) {
      return;
    }

    if (preview.summary.error > 0) {
      setError({
        message: "Importできないエラーがあります。JSONの内容を修正してから再度プレビューしてください。",
        status: 400
      });
      return;
    }

    if (!window.confirm(getImportConfirmationMessage(preview.conflicts, conflictActions, defaultAction))) {
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const result = await importJsonData({
        ...importPayload,
        conflictResolution: {
          defaultAction,
          items: preview.conflicts.map((conflict) => ({
            entity: conflict.entity,
            incomingId: conflict.incomingId,
            existingId: conflict.existingId,
            action: conflictActions[conflictKey(conflict)] ?? defaultAction
          }))
        }
      });

      setImportResult(result);
      setPreview(null);
      setImportPayload(null);
      setImportSource(null);
      setConflictActions({});
      setDefaultAction("skip");
    } catch (importError) {
      const apiError = importError as ApiError;
      setError(apiError);
      focusFirstFieldError(apiError, "json-import");
    } finally {
      setIsImporting(false);
    }
  }

  function applyAllConflicts(action: ImportAction) {
    if (action === "overwrite") {
      const conflictCount = preview?.conflicts.length ?? 0;

      if (!window.confirm(getBulkOverwriteConfirmationMessage(conflictCount))) {
        return;
      }
    }

    setDefaultAction(action);
    setConflictActions(createInitialConflictActions(preview?.conflicts ?? [], action));
  }

  function setConflictAction(conflict: ImportConflict, action: ImportAction) {
    setConflictActions((current) => ({
      ...current,
      [conflictKey(conflict)]: action
    }));
  }

  function clearImportReview() {
    const reset = createEmptyImportReviewState();

    setError(null);
    setImportResult(reset.importResult);
    setPreview(reset.preview);
    setImportPayload(reset.importPayload);
    setImportSource(reset.importSource);
    setConflictActions(reset.conflictActions);
    setDefaultAction(reset.defaultAction);
  }

  return (
    <section className="page-panel">
      <div className="page-heading">
        <p className="eyebrow">Data</p>
        <h2>データ入出力</h2>
        <p>
          JSONはバックアップ、移行、復元用の正式形式です。Importは必ずプレビューして、重複時はWindowsのコピーのように上書き/無視を選べます。
        </p>
      </div>

      {error ? (
        <ErrorState
          details={
            error.errors?.length ? (
              <ul className="field-error-list">
                {error.errors.map((item) => (
                  <li key={`${item.field}:${item.message}`}>
                    <a href="#json-import">{item.field || "JSON"}</a>
                    <span>{item.message}</span>
                  </li>
                ))}
              </ul>
            ) : null
          }
          title="データ入出力に失敗しました"
        >
          {getFormErrorSummary(error)}
        </ErrorState>
      ) : null}

      <div className="data-flow-grid">
        <section className="data-card export-card">
          <div>
            <p className="eyebrow">JSON Export</p>
            <h3>バックアップを書き出す</h3>
            <p>本、保管場所、分類タグ、タグの紐づけをJSONとして保存します。</p>
          </div>
          <p className="safety-note">Exportは元データを変更しない安全なバックアップ操作です。</p>
          <button className="button-primary" disabled={isExporting} onClick={() => void handleExport()} type="button">
            {isExporting ? "Export中..." : "JSONをExport"}
          </button>
          {exportMessage ? <p className="inline-message">{exportMessage}</p> : null}
        </section>

        <section className="data-card import-card">
          <div>
            <p className="eyebrow">JSON Import</p>
            <h3>JSONを読み込む</h3>
            <p>ExportしたJSONファイルを選ぶか、内容を貼り付けてプレビューします。</p>
          </div>
          <p className="safety-warning">Importはデータを追加・更新します。必ずプレビューを確認してから実行してください。</p>

          <label className="file-input-label">
            <span>JSONファイル</span>
            <input accept=".json,application/json" onChange={(event) => void handleFileChange(event)} type="file" />
          </label>

          <label className="json-paste-field">
            <span>JSON貼り付け</span>
            <textarea
              aria-describedby={error?.errors?.length ? "json-import-error" : undefined}
              aria-invalid={Boolean(error?.errors?.length)}
              id="json-import"
              onChange={(event) => setJsonText(event.target.value)}
              placeholder='{"version":1,"books":[],"locations":[],"classificationTags":[],"bookClassificationTags":[]}'
              value={jsonText}
            />
            {error?.errors?.length ? (
              <p className="field-error" id="json-import-error">
                上のエラー項目を確認し、JSONを修正してから再度プレビューしてください。
              </p>
            ) : null}
          </label>

          <button className="button-secondary" disabled={isPreviewing} onClick={() => void handlePreview()} type="button">
            {isPreviewing ? "プレビュー中..." : "Importプレビュー"}
          </button>
        </section>
      </div>

      {preview ? (
        <section className="import-preview-panel">
          <div className="import-preview-heading">
            <div>
              <p className="eyebrow">Import Preview</p>
              <h3>Importプレビュー</h3>
              <p className="preview-source">入力元: {importSource ?? "JSON"}</p>
            </div>
            <div className="preview-action-group">
              {preview.summary.conflict > 0 ? (
                <p className="preview-action-warning">競合 {preview.summary.conflict} 件。上書き対象を確認してください。</p>
              ) : null}
              <button
                className="button-primary"
                disabled={isImporting || preview.summary.error > 0}
                onClick={() => void handleImport()}
                type="button"
              >
                {isImporting ? "Import中..." : "この内容でImport"}
              </button>
            </div>
          </div>

          <div className="import-summary-grid">
            <SummaryCard label="追加候補" value={preview.summary.create} />
            <SummaryCard label="競合" value={preview.summary.conflict} />
            <SummaryCard label="エラー" value={preview.summary.error} tone={preview.summary.error > 0 ? "danger" : "normal"} />
          </div>

          {preview.errors.length > 0 ? (
            <section className="preview-section danger">
              <h4>Importできないエラー</h4>
              <div className="issue-list">
                {preview.errors.map((item) => (
                  <article key={`${item.field}:${item.message}`}>
                    <strong>{item.field}</strong>
                    <p>{item.message}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="preview-section">
            <div className="conflict-toolbar">
              <div>
                <h4>重複時の処理</h4>
                <p>初期状態はすべて無視です。必要な項目だけ上書きに切り替えられます。</p>
              </div>
              <div className="form-actions">
                <button className="button-secondary" onClick={() => applyAllConflicts("skip")} type="button">
                  すべて無視
                </button>
                <button
                  className="button-danger"
                  disabled={isImporting}
                  onClick={() => applyAllConflicts("overwrite")}
                  type="button"
                >
                  すべて上書き
                </button>
              </div>
            </div>

            {preview.conflicts.length === 0 ? (
              <p className="subtle-text">重複はありません。新しいデータとして追加されます。</p>
            ) : (
              <div className="conflict-list">
                {preview.conflicts.map((conflict) => (
                  <article className="conflict-card" key={conflictKey(conflict)}>
                    <div>
                      <span className="status-pill">{formatEntity(conflict.entity)}</span>
                      <h5>{formatMatchBy(conflict.matchBy)} が重複しています</h5>
                      <dl className="meta-list">
                        <div>
                          <dt>Import ID</dt>
                          <dd>{conflict.incomingId}</dd>
                        </div>
                        <div>
                          <dt>既存 ID</dt>
                          <dd>{conflict.existingId}</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="conflict-actions" aria-label="競合解決">
                      <label>
                        <input
                          checked={(conflictActions[conflictKey(conflict)] ?? defaultAction) === "skip"}
                          onChange={() => setConflictAction(conflict, "skip")}
                          type="radio"
                        />
                        <span>無視</span>
                      </label>
                      <label>
                        <input
                          checked={(conflictActions[conflictKey(conflict)] ?? defaultAction) === "overwrite"}
                          onChange={() => setConflictAction(conflict, "overwrite")}
                          type="radio"
                        />
                        <span>上書き</span>
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      ) : null}

      {importResult ? (
        <section className="import-preview-panel result">
          <p className="eyebrow">Import Result</p>
          <h3>Import結果</h3>
          <div className="import-result-grid">
            <ResultGroup title="追加" values={importResult.imported} />
            <ResultGroup title="上書き" values={importResult.overwritten} />
            <ResultGroup title="無視" values={importResult.skipped} />
          </div>
        </section>
      ) : null}
    </section>
  );
}

function SummaryCard({ label, tone = "normal", value }: { label: string; tone?: "danger" | "normal"; value: number }) {
  return (
    <article className={tone === "danger" ? "summary-card danger" : "summary-card"}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function ResultGroup({
  title,
  values
}: {
  title: string;
  values: { books: number; locations: number; classificationTags: number };
}) {
  return (
    <article className="result-group">
      <h4>{title}</h4>
      <dl className="meta-list">
        <div>
          <dt>本</dt>
          <dd>{values.books}</dd>
        </div>
        <div>
          <dt>保管場所</dt>
          <dd>{values.locations}</dd>
        </div>
        <div>
          <dt>分類タグ</dt>
          <dd>{values.classificationTags}</dd>
        </div>
      </dl>
    </article>
  );
}

function createInitialConflictActions(conflicts: ImportConflict[], action: ImportAction) {
  return Object.fromEntries(conflicts.map((conflict) => [conflictKey(conflict), action]));
}

function conflictKey(conflict: Pick<ImportConflict, "entity" | "existingId" | "incomingId">) {
  return `${conflict.entity}:${conflict.incomingId}:${conflict.existingId}`;
}

function downloadJson(payload: JsonExportPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `book-manager-export-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function createFileReadError(error: unknown): ApiError {
  const detail = error instanceof Error && error.message ? ` (${error.message})` : "";

  return {
    message: `JSONファイルを読み込めませんでした。ファイルを確認して再度お試しください。${detail}`,
    status: 400
  };
}

export function createEmptyImportReviewState() {
  return {
    conflictActions: {} as ConflictActions,
    defaultAction: "skip" as const,
    importPayload: null as JsonExportPayload | null,
    importResult: null as ImportResult | null,
    importSource: null as string | null,
    preview: null as ImportPreview | null
  };
}

export function getBulkOverwriteConfirmationMessage(conflictCount: number) {
  return `競合している${conflictCount}件のデータをすべて上書き対象にします。既存データがImport内容で置き換わります。続けますか？`;
}

export function getImportConfirmationMessage(
  conflicts: ImportConflict[],
  conflictActions: ConflictActions,
  defaultAction: ImportAction
) {
  const overwriteCount = conflicts.filter(
    (conflict) => (conflictActions[conflictKey(conflict)] ?? defaultAction) === "overwrite"
  ).length;

  if (overwriteCount > 0) {
    return `Importを実行します。新規データに加えて、既存データ${overwriteCount}件を上書きします。内容を確認しましたか？`;
  }

  return "Importを実行します。既存データは無視し、新しいデータだけを追加します。内容を確認しましたか？";
}

function formatEntity(entity: ImportConflict["entity"]) {
  switch (entity) {
    case "book":
      return "本";
    case "classificationTag":
      return "分類タグ";
    case "location":
      return "保管場所";
  }
}

function formatMatchBy(matchBy: ImportConflict["matchBy"]) {
  switch (matchBy) {
    case "id":
      return "ID";
    case "managementBarcode":
      return "管理用バーコード";
    case "name":
      return "名前";
  }
}
