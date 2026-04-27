type BookFormPageProps = {
  mode: "create" | "edit";
  bookId?: string;
};

export function BookFormPage({ mode, bookId }: BookFormPageProps) {
  const isEdit = mode === "edit";

  return (
    <section className="page-panel">
      <div className="page-heading">
        <p className="eyebrow">{isEdit ? "Edit Book" : "New Book"}</p>
        <h2>{isEdit ? "本編集" : "本登録"}</h2>
        <p>
          {isEdit
            ? `対象ID: ${bookId} の登録情報を編集する画面にします。`
            : "本のバーコード照会、管理用バーコード、保管場所、分類タグを入力する画面にします。"}
        </p>
      </div>
      <div className="placeholder-grid">
        <div>書誌情報フォーム</div>
        <div>バーコード入力</div>
        <div>分類タグ候補</div>
      </div>
    </section>
  );
}
