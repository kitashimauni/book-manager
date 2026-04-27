export function DataPage() {
  return (
    <section className="page-panel">
      <div className="page-heading">
        <p className="eyebrow">Data</p>
        <h2>データ入出力</h2>
        <p>JSON Export/Import、Importプレビュー、重複時の上書き/無視選択を扱う画面にします。</p>
      </div>
      <div className="placeholder-grid">
        <div>Export</div>
        <div>Import Preview</div>
        <div>Conflict Resolution</div>
      </div>
    </section>
  );
}
