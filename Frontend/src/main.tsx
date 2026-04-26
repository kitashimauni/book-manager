import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Book Manager</p>
        <h1>自宅や研究室の蔵書を、バーコードと保管場所で管理する。</h1>
        <p className="lead">
          MVPでは本の登録、検索、保管場所タグ、分類タグ、Export/Import、
          Open LibraryのISBN照会を実装していきます。
        </p>
        <div className="panel">
          <span>Backend API</span>
          <code>{apiBaseUrl || "/api"}</code>
        </div>
      </section>
    </main>
  );
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element was not found.");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
