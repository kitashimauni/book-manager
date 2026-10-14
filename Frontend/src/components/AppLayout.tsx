import type { ReactNode } from "react";
import { Link } from "./Link.js";
import { resolveRoute } from "../router.js";

type AppLayoutProps = {
  backendStatus: ReactNode;
  children: ReactNode;
  currentPath: string;
};

const navigationItems = [
  { href: "/books", label: "本一覧" },
  { href: "/books/new", label: "本登録" },
  { href: "/locations", label: "保管場所" },
  { href: "/classification-tags", label: "分類タグ" },
  { href: "/data", label: "入出力" }
];

export function AppLayout({ backendStatus, children, currentPath }: AppLayoutProps) {
  const activeNavigationHref = getActiveNavigationHref(currentPath);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="メインナビゲーション">
        <div className="brand">
          <span className="brand-mark">BM</span>
          <div>
            <p className="eyebrow">Book Manager</p>
            <h1>蔵書管理</h1>
          </div>
        </div>
        <nav className="nav-list">
          {navigationItems.map((item) => (
            <Link
              className={activeNavigationHref === item.href ? "nav-link active" : "nav-link"}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content-shell">
        <header className="content-header">
          <div className="content-context">
            <p className="eyebrow">Workspace</p>
            <strong>蔵書管理</strong>
          </div>
          {backendStatus}
        </header>
        {children}
      </main>
    </div>
  );
}

export function getActiveNavigationHref(currentPath: string): string | null {
  switch (resolveRoute(currentPath).name) {
    case "books":
      return "/books";
    case "bookNew":
      return "/books/new";
    case "bookDetail":
    case "bookEdit":
      return "/books";
    case "locations":
      return "/locations";
    case "classificationTags":
      return "/classification-tags";
    case "data":
      return "/data";
    case "notFound":
      return null;
  }
}
