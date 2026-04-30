import type { AppConfig } from "../config/env.js";
import type { BookLookupResult } from "../schemas/books.js";
import { isLikelyIsbn, normalizeIsbn } from "./openLibrary.js";

export type NdlSearchLookupServiceOptions = {
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  minRequestIntervalMs?: number;
};

const defaultLookupService = createNdlSearchLookupService();

export async function lookupBookByIsbn(
  rawIsbn: string,
  config: AppConfig
): Promise<BookLookupResult | null> {
  return defaultLookupService.lookupBookByIsbn(rawIsbn, config);
}

export function createNdlSearchLookupService(options: NdlSearchLookupServiceOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep =
    options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const now = options.now ?? Date.now;
  let lastRequestAt: number | null = null;

  async function waitForRequestSlot() {
    const minIntervalMs = options.minRequestIntervalMs ?? 1000;
    const currentTime = now();
    const elapsed = lastRequestAt === null ? minIntervalMs : currentTime - lastRequestAt;

    if (elapsed < minIntervalMs) {
      await sleep(minIntervalMs - elapsed);
    }

    lastRequestAt = now();
  }

  return {
    async lookupBookByIsbn(rawIsbn: string, config: AppConfig): Promise<BookLookupResult | null> {
      const isbn = normalizeIsbn(rawIsbn);

      if (!isLikelyIsbn(isbn)) {
        return null;
      }

      await waitForRequestSlot();

      const url = new URL("https://ndlsearch.ndl.go.jp/api/opensearch");
      url.searchParams.set("isbn", isbn);
      url.searchParams.set("cnt", "1");

      const response = await fetchImpl(url.toString(), {
        headers: buildNdlSearchHeaders(config)
      });

      if (!response.ok) {
        throw new Error(`NDL Search lookup failed with status ${response.status}`);
      }

      const payload = await response.text();
      return mapNdlSearchResponse(payload, isbn);
    }
  };
}

function buildNdlSearchHeaders(config: AppConfig): HeadersInit {
  const appName = config.openLibraryAppName ?? "book-manager";
  const contact = config.openLibraryContact ? ` (${config.openLibraryContact})` : "";

  return {
    Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
    "User-Agent": `${appName}${contact}`
  };
}

export function mapNdlSearchResponse(payload: string, fallbackIsbn: string): BookLookupResult | null {
  const item = extractFirstItem(payload);

  if (!item) {
    return null;
  }

  const title = firstText(item, "title");

  if (!title) {
    return null;
  }

  const responsibilityStatement = extractResponsibilityStatement(item);
  const subjects = uniqueTexts(subjectTagTexts(item));

  return {
    title,
    author: responsibilityStatement,
    publisher: firstText(item, "publisher"),
    publishedDate: firstText(item, "date") ?? firstText(item, "issued"),
    isbn: extractIsbn(item) ?? fallbackIsbn,
    externalSource: "ndl_search",
    externalId: firstText(item, "link") ?? firstText(item, "guid"),
    classificationTagCandidates: subjects
  };
}

function extractFirstItem(payload: string): string | null {
  return /<item\b[^>]*>([\s\S]*?)<\/item>/i.exec(payload)?.[1] ?? null;
}

function firstText(source: string, localName: string): string | undefined {
  return texts(source, localName)[0];
}

function texts(source: string, localName: string): string[] {
  return textElements(source, localName)
    .map((element) => normalizeXmlText(element.content))
    .filter((value) => value.length > 0);
}

function subjectTagTexts(source: string): string[] {
  return textElements(source, "subject")
    .filter((element) => !hasSubjectEncodingScheme(element.attributes))
    .map((element) => normalizeXmlText(element.content))
    .filter((value) => value.length > 0);
}

function hasSubjectEncodingScheme(attributes: string): boolean {
  return /\b(?:xsi:type|rdf:datatype|rdf:resource)\s*=/.test(attributes);
}

function uniqueTexts(values: string[]): string[] {
  return [...new Set(values)];
}

function extractResponsibilityStatement(source: string): string | undefined {
  for (const description of elementContents(source, "description")) {
    const match = /責任表示[:：]\s*([^<]+)/.exec(description);

    if (match?.[1]) {
      return normalizeXmlText(match[1]);
    }
  }

  return undefined;
}

function elementContents(source: string, localName: string): string[] {
  return textElements(source, localName).map((element) => element.content);
}

function textElements(source: string, localName: string) {
  const pattern = new RegExp(
    `<(?:[\\w.-]+:)?${escapeRegExp(localName)}\\b([^>]*)>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?${escapeRegExp(localName)}>`,
    "gi"
  );

  return [...source.matchAll(pattern)].map((match) => ({
    attributes: match[1] ?? "",
    content: match[2] ?? ""
  }));
}

function normalizeXmlText(value: string): string {
  return decodeXmlEntities(value.replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractIsbn(source: string): string | undefined {
  for (const identifier of texts(source, "identifier")) {
    const isbn = isbnFromText(identifier);

    if (isbn) {
      return isbn;
    }
  }

  return isbnFromText(normalizeXmlText(source));
}

function isbnFromText(value: string): string | undefined {
  const isbnLikeValues = value.match(/(?:97[89][-\s]?)?\d[-\s]?\d{2,5}[-\s]?\d{2,7}[-\s]?[\dXx]/g) ?? [];

  for (const candidate of isbnLikeValues) {
    const isbn = normalizeIsbn(candidate);

    if (isLikelyIsbn(isbn)) {
      return isbn;
    }
  }

  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
