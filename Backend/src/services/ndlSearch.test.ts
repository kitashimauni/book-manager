import { describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../config/env.js";
import { createNdlSearchLookupService, mapNdlSearchResponse } from "./ndlSearch.js";

const baseConfig: AppConfig = {
  port: 0,
  corsOrigin: "http://localhost:3000",
  databasePath: ":memory:"
};

function xmlResponse(payload: string, init?: ResponseInit) {
  return new Response(payload, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml"
    },
    ...init
  });
}

describe("NDL Search lookup service", () => {
  it("looks up an ISBN with NDL Search OpenSearch and maps RSS metadata", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
        <rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">
          <channel>
            <item>
              <title>ハッキングAPI : Web APIを攻撃から守るためのテスト技法</title>
              <link>https://ndlsearch.ndl.go.jp/books/R100000002-I032705948</link>
              <dc:creator>COREY BALL 著</dc:creator>
              <dc:creator>田辺 茂也 訳</dc:creator>
              <dc:publisher>オライリー・ジャパン</dc:publisher>
              <dcterms:issued>2023.3</dcterms:issued>
              <dc:identifier>ISBN:978-4-8144-0024-9</dc:identifier>
              <dc:subject>Web API</dc:subject>
              <dc:subject>情報セキュリティ</dc:subject>
            </item>
          </channel>
        </rss>`)
    );
    const service = createNdlSearchLookupService({
      fetchImpl,
      minRequestIntervalMs: 0
    });

    const result = await service.lookupBookByIsbn("ISBN 978-4-8144-0024-9", baseConfig);

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://ndlsearch.ndl.go.jp/api/opensearch?isbn=9784814400249&cnt=1",
      expect.objectContaining({
        headers: {
          Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
          "User-Agent": "book-manager"
        }
      })
    );
    expect(result).toEqual({
      title: "ハッキングAPI : Web APIを攻撃から守るためのテスト技法",
      author: "COREY BALL 著, 田辺 茂也 訳",
      publisher: "オライリー・ジャパン",
      publishedDate: "2023.3",
      isbn: "9784814400249",
      externalSource: "ndl_search",
      externalId: "https://ndlsearch.ndl.go.jp/books/R100000002-I032705948",
      classificationTagCandidates: ["Web API", "情報セキュリティ"]
    });
  });

  it("returns null and caches repeated misses when no RSS item is returned", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><rss><channel /></rss>`)
    );
    const service = createNdlSearchLookupService({
      fetchImpl,
      minRequestIntervalMs: 0
    });

    await expect(service.lookupBookByIsbn("9784814400249", baseConfig)).resolves.toBeNull();
    await expect(service.lookupBookByIsbn("978-4-8144-0024-9", baseConfig)).resolves.toBeNull();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not call NDL Search for non-ISBN input", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const service = createNdlSearchLookupService({
      fetchImpl,
      minRequestIntervalMs: 0
    });

    const result = await service.lookupBookByIsbn("BM-000001", baseConfig);

    expect(result).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws for NDL Search failures", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }));
    const service = createNdlSearchLookupService({
      fetchImpl,
      minRequestIntervalMs: 0
    });

    await expect(service.lookupBookByIsbn("9784814400249", baseConfig)).rejects.toThrow(
      "NDL Search lookup failed with status 503"
    );
  });

  it("sends optional app and contact information in User-Agent", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      xmlResponse(`<rss><channel><item><title>APIの本</title></item></channel></rss>`)
    );
    const service = createNdlSearchLookupService({
      fetchImpl,
      minRequestIntervalMs: 0
    });

    await service.lookupBookByIsbn("9784814400249", {
      ...baseConfig,
      openLibraryAppName: "lab-library",
      openLibraryContact: "admin@example.test"
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://ndlsearch.ndl.go.jp/api/opensearch?isbn=9784814400249&cnt=1",
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": "lab-library (admin@example.test)"
        })
      })
    );
  });

  it("parses escaped XML entities", () => {
    const result = mapNdlSearchResponse(
      `<rss><channel><item><title>A &amp; B</title><dc:subject>R&amp;D</dc:subject></item></channel></rss>`,
      "9780000000002"
    );

    expect(result?.title).toBe("A & B");
    expect(result?.classificationTagCandidates).toEqual(["R&D"]);
  });
});
