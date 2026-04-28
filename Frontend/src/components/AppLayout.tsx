import type { ReactNode } from "react";
import { Link } from "./Link.js";

type AppLayoutProps = {
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

export function AppLayout({ children, currentPath }: AppLayoutProps) {
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
              className={isActive(currentPath, item.href) ? "nav-link active" : "nav-link"}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content-shell">{children}</main>
    </div>
  );
}

function isActive(currentPath: string, href: string) {
  if (href === "/books") {
    return currentPath === "/books" || currentPath.startsWith("/books/");
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}
