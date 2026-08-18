import type { ApiError } from "./api/client.js";

type ApiFieldError = NonNullable<ApiError["errors"]>[number];

export function getFieldError(error: ApiError | null, field: string) {
  return error?.errors?.find((item) => item.field === field)?.message;
}

export function getFormErrorSummary(error: ApiError) {
  return error.errors?.length
    ? "入力内容を確認し、各項目のエラーを修正してから再度保存してください。"
    : error.message;
}

export function getFieldErrorDetails(error: ApiError | null) {
  return error?.errors ?? [];
}

export function focusFirstFieldError(error: ApiError, fallbackId?: string) {
  const firstField = error.errors?.find((item) => item.field)?.field;
  const target = (firstField ? document.getElementById(firstField) : null) ??
    (fallbackId ? document.getElementById(fallbackId) : null);

  if (!target) {
    return;
  }

  target.focus();

  if (typeof target.scrollIntoView === "function") {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export function formatFieldLabel(field: ApiFieldError["field"]) {
  const labels: Record<string, string> = {
    author: "著者",
    bookBarcode: "本のバーコード",
    classificationTagIds: "分類タグ",
    description: "説明",
    isbn: "ISBN",
    locationId: "保管場所",
    managementBarcode: "管理用バーコード",
    managementMemo: "管理メモ",
    name: "名前",
    publishedDate: "出版日",
    publisher: "出版社",
    sortOrder: "表示順",
    source: "由来",
    title: "タイトル"
  };

  return labels[field] ?? field;
}
