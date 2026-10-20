export type BookIdentifierValues = {
  bookBarcode: string;
  isbn: string;
};

export function normalizeIsbn(value: string) {
  return value.replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function isValidIsbn(value: string) {
  const isbn = normalizeIsbn(value);

  return isValidIsbn10(isbn) || isValidIsbn13(isbn);
}

export function interpretBookIdentifier(value: string): BookIdentifierValues {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { bookBarcode: "", isbn: "" };
  }

  const normalizedIsbn = normalizeIsbn(trimmedValue);

  if (isValidIsbn(normalizedIsbn)) {
    return {
      bookBarcode: normalizedIsbn.length === 13 ? normalizedIsbn : "",
      isbn: normalizedIsbn
    };
  }

  return {
    bookBarcode: trimmedValue,
    isbn: ""
  };
}

export function getBookIdentifierInputValue(values: BookIdentifierValues) {
  return values.bookBarcode.trim() || values.isbn.trim();
}

export function getBookLookupValue(values: BookIdentifierValues) {
  const bookBarcode = values.bookBarcode.trim();
  const isbn = values.isbn.trim();

  if (isValidIsbn(isbn)) {
    return isbn;
  }

  return bookBarcode || isbn;
}

export function mergeLookupIdentifiers(
  current: BookIdentifierValues,
  lookupValue: string,
  resultIsbn?: string
): BookIdentifierValues {
  const interpretedLookup = interpretBookIdentifier(lookupValue);
  const normalizedResultIsbn = resultIsbn ? normalizeIsbn(resultIsbn) : "";
  const resolvedResultIsbn = isValidIsbn(normalizedResultIsbn) ? normalizedResultIsbn : "";

  return {
    bookBarcode: current.bookBarcode.trim() || interpretedLookup.bookBarcode,
    isbn: resolvedResultIsbn || current.isbn || interpretedLookup.isbn
  };
}

function isValidIsbn10(isbn: string) {
  if (!/^\d{9}[\dX]$/.test(isbn)) {
    return false;
  }

  const sum = [...isbn].reduce((current, character, index) => {
    const value = character === "X" ? 10 : Number(character);

    return current + value * (10 - index);
  }, 0);

  return sum % 11 === 0;
}

function isValidIsbn13(isbn: string) {
  if (!/^(?:978|979)\d{10}$/.test(isbn)) {
    return false;
  }

  const sum = [...isbn].reduce((current, character, index) => {
    const value = Number(character);

    return current + value * (index % 2 === 0 ? 1 : 3);
  }, 0);

  return sum % 10 === 0;
}
