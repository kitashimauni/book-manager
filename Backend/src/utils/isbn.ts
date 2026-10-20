export function normalizeIsbn(value: string): string {
  return value.replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function isValidIsbn(value: string): boolean {
  const isbn = normalizeIsbn(value);

  return isValidIsbn10(isbn) || isValidIsbn13(isbn);
}

export function getIsbnEquivalentValues(value: string): string[] {
  const isbn = normalizeIsbn(value);

  if (!isValidIsbn(isbn)) {
    return [isbn];
  }

  if (isbn.length === 10) {
    return [isbn, convertIsbn10To13(isbn)];
  }

  if (isbn.startsWith("978")) {
    return [isbn, convertIsbn13To10(isbn)];
  }

  return [isbn];
}

function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) {
    return false;
  }

  const sum = [...isbn].reduce((current, character, index) => {
    const value = character === "X" ? 10 : Number(character);

    return current + value * (10 - index);
  }, 0);

  return sum % 11 === 0;
}

function isValidIsbn13(isbn: string): boolean {
  if (!/^(?:978|979)\d{10}$/.test(isbn)) {
    return false;
  }

  const sum = [...isbn].reduce((current, character, index) => {
    const value = Number(character);

    return current + value * (index % 2 === 0 ? 1 : 3);
  }, 0);

  return sum % 10 === 0;
}

function convertIsbn10To13(isbn: string) {
  const body = `978${isbn.slice(0, 9)}`;
  const sum = [...body].reduce(
    (current, character, index) => current + Number(character) * (index % 2 === 0 ? 1 : 3),
    0
  );
  const checkDigit = (10 - (sum % 10)) % 10;

  return `${body}${checkDigit}`;
}

function convertIsbn13To10(isbn: string) {
  const body = isbn.slice(3, 12);
  const sum = [...body].reduce(
    (current, character, index) => current + Number(character) * (10 - index),
    0
  );
  const checkDigit = (11 - (sum % 11)) % 11;

  return `${body}${checkDigit === 10 ? "X" : checkDigit}`;
}
