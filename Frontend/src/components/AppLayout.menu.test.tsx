import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppLayout } from "./AppLayout.js";

describe("AppLayout mobile navigation markup", () => {
  it("keeps an accessible disclosure toggle and a separate menu in the sidebar", () => {
    const html = renderToStaticMarkup(
      <AppLayout backendStatus={null} currentPath="/books">
        <div>一覧のコンテンツ</div>
      </AppLayout>
    );

    expect(html).toContain('aria-controls="primary-navigation"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('id="primary-navigation"');
    expect(html).toContain('class="nav-list"');
    expect(html).toContain("メニューを開く");
    expect(html).toContain("一覧のコンテンツ");
    expect(html.indexOf('id="primary-navigation"')).toBeLessThan(html.indexOf("一覧のコンテンツ"));
  });
});
