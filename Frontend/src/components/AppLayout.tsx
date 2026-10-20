import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";
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
  const contentHeaderClassName = getContentHeaderClassName(backendStatus);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const mobileNavToggleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    mobileNavRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setIsMobileNavOpen(false);
      mobileNavToggleRef.current?.focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileNavOpen]);

  function handleNavigationSelect(event: MouseEvent<HTMLAnchorElement>) {
    if (
      !isMobileNavOpen ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    setIsMobileNavOpen(false);
    mobileNavToggleRef.current?.focus();
  }

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
        <button
          aria-controls="primary-navigation"
          aria-expanded={isMobileNavOpen}
          className="mobile-nav-toggle"
          onClick={() => setIsMobileNavOpen((isOpen) => !isOpen)}
          ref={mobileNavToggleRef}
          type="button"
        >
          <span>{isMobileNavOpen ? "メニューを閉じる" : "メニューを開く"}</span>
          <span aria-hidden="true" className="mobile-nav-toggle-icon">
            {isMobileNavOpen ? "×" : "☰"}
          </span>
        </button>
        <nav
          aria-label="ページ"
          className={isMobileNavOpen ? "nav-list mobile-nav-open" : "nav-list"}
          id="primary-navigation"
          ref={mobileNavRef}
        >
          {navigationItems.map((item) => (
            <Link
              aria-current={activeNavigationHref === item.href ? "page" : undefined}
              className={activeNavigationHref === item.href ? "nav-link active" : "nav-link"}
              href={item.href}
              key={item.href}
              onClick={handleNavigationSelect}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      {isMobileNavOpen ? (
        <button
          aria-label="メニューを閉じる"
          className="mobile-nav-dismiss"
          onClick={() => {
            setIsMobileNavOpen(false);
            mobileNavToggleRef.current?.focus();
          }}
          tabIndex={-1}
          type="button"
        />
      ) : null}
      <main className="content-shell">
        <header className={contentHeaderClassName}>
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

export function getContentHeaderClassName(backendStatus: ReactNode): string {
  return backendStatus ? "content-header has-backend-status" : "content-header";
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
