import type { AppConfig } from "../config/env.js";
import type { BookLookupResult } from "../schemas/books.js";
import type { LookupResponse } from "./bookLookupCache.js";
import { isLikelyIsbn, normalizeIsbn } from "./openLibrary.js";
import { createSerializedRequestQueue } from "./requestQueue.js";
import { appendVolumeMetadata } from "./lookupTitle.js";
import { resolveNdc9Label } from "./ndc9.js";

export type NdlSearchLookupServiceOptions = {
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  minRequestIntervalMs?: number;
};

export function createNdlSearchLookupService(options: NdlSearchLookupServiceOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep =
    options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const now = options.now ?? Date.now;
  const requestQueue = createSerializedRequestQueue({ sleep, now });

  async function lookupBookByIsbnWithMetadata(
    rawIsbn: string,
    config: AppConfig
  ): Promise<LookupResponse> {
    const isbn = normalizeIsbn(rawIsbn);

    if (!isLikelyIsbn(isbn)) {
      return { value: null, metadata: {} };
    }

    return requestQueue.enqueue(options.minRequestIntervalMs ?? 1000, async () => {
      const url = new URL("https://ndlsearch.ndl.go.jp/api/opensearch");
      url.searchParams.set("isbn", isbn);
      url.searchParams.set("cnt", "1");

      const response = await fetchImpl(url.toString(), {
        headers: buildNdlSearchHeaders(config)
      });
      const payload = await response.text();
      const metadata = {
        requestUrl: url.toString(),
        responseStatus: response.status,
        responseContentType: response.headers.get("content-type") ?? undefined,
        responseBody: payload
      };

      if (!response.ok) {
        throw new Error(`NDL Search lookup failed with status ${response.status}`);
      }

      return {
        value: mapNdlSearchResponse(payload, isbn),
        metadata
      };
    });
  }

  return {
    async lookupBookByIsbn(rawIsbn: string, config: AppConfig): Promise<BookLookupResult | null> {
      const response = await lookupBookByIsbnWithMetadata(rawIsbn, config);
      return response.value;
    },
    lookupBookByIsbnWithMetadata
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
  const ndc9TagCandidates = ndc9SubjectCodes(item)
    .map((code) => resolveNdc9Label(code))
    .filter((label): label is string => Boolean(label));
  const tagCandidates = uniqueTexts([
    ...subjectTagTexts(item),
    ...genreTagTexts(item),
    ...ndc9TagCandidates
  ]);

  return {
    title: appendVolumeMetadata(title, firstText(item, "volume"), firstText(item, "volumeTitle")),
    author: responsibilityStatement,
    publisher: firstText(item, "publisher"),
    publishedDate: firstText(item, "date") ?? firstText(item, "issued"),
    isbn: extractIsbn(item) ?? fallbackIsbn,
    externalSource: "ndl_search",
    externalId: firstText(item, "link") ?? firstText(item, "guid"),
    classificationTagCandidates: tagCandidates
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
    .map((element) => extractStructuredValue(element.content))
    .filter((value) => value.length > 0);
}

function ndc9SubjectCodes(source: string): string[] {
  const subjectElements = textElements(source, "subject");
  const literalCodes = subjectElements
    .filter((element) => hasNdc9EncodingScheme(element.attributes))
    .map((element) => normalizeXmlText(element.content));
  const resourceCodes = [...subjectElements, ...selfClosingElements(source, "subject")]
    .map((element) => extractNdc9ResourceCode(element.attributes))
    .filter((code): code is string => Boolean(code));

  return [...literalCodes, ...resourceCodes];
}

function hasNdc9EncodingScheme(attributes: string): boolean {
  return (
    /\bxsi:type\s*=\s*["']dcndl:NDC9["']/i.test(attributes) ||
    /\brdf:datatype\s*=\s*["']https?:\/\/ndl\.go\.jp\/dcndl\/terms\/NDC9["']/i.test(attributes)
  );
}

function extractNdc9ResourceCode(attributes: string): string | undefined {
  const resource = /\brdf:resource\s*=\s*["'](https?:\/\/id\.ndl\.go\.jp\/class\/ndc9\/[^"']+)["']/i.exec(
    attributes
  )?.[1];

  if (!resource) {
    return undefined;
  }

  try {
    return decodeURIComponent(resource.slice(resource.lastIndexOf("/ndc9/") + "/ndc9/".length));
  } catch {
    return undefined;
  }
}

function hasSubjectEncodingScheme(attributes: string): boolean {
  return /\b(?:xsi:type|rdf:datatype|rdf:resource)\s*=/.test(attributes);
}

function genreTagTexts(source: string): string[] {
  return textElements(source, "genre")
    .map((element) => extractStructuredValue(element.content))
    .filter((value) => value.length > 0);
}

function extractStructuredValue(source: string): string {
  return firstText(source, "value") ?? normalizeXmlText(source);
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

function selfClosingElements(source: string, localName: string) {
  const pattern = new RegExp(
    `<(?:[\\w.-]+:)?${escapeRegExp(localName)}\\b([^>]*?)/>`,
    "gi"
  );

  return [...source.matchAll(pattern)].map((match) => ({
    attributes: match[1] ?? ""
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
