import type { BookIdentifierMatch, BookIdentifierMatchField } from "./api/client.js";

export type IdentifierCheckValues = {
  bookBarcode: string;
  isbn: string;
  managementBarcode: string;
};

export type IdentifierCheckRequest = {
  field: BookIdentifierMatchField;
  value: string;
};

export function getIdentifierCheckRequests(values: IdentifierCheckValues): IdentifierCheckRequest[] {
  const bookIdentifierValues = [...new Set([values.bookBarcode.trim(), values.isbn.trim()].filter(Boolean))];
  const requests: IdentifierCheckRequest[] = bookIdentifierValues.map((value) => ({
    field: "bookIdentifier" as const,
    value
  }));

  if (values.managementBarcode.trim()) {
    requests.push({
      field: "managementBarcode",
      value: values.managementBarcode.trim()
    });
  }

  return requests;
}

export function mergeIdentifierMatches(matchGroups: BookIdentifierMatch[][]) {
  const matchesById = new Map<string, BookIdentifierMatch>();

  for (const matches of matchGroups) {
    for (const match of matches) {
      matchesById.set(match.id, match);
    }
  }

  return [...matchesById.values()].sort(
    (left, right) => left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
  );
}

export function getIdentifierCheckKey(values: IdentifierCheckValues) {
  return [values.bookBarcode.trim(), values.isbn.trim(), values.managementBarcode.trim()].join("\u0000");
}
