export function normalizeIsbn(value: string): string {
  return value.replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function isValidIsbn(value: string): boolean {
  const isbn = normalizeIsbn(value);

  return isValidIsbn10(isbn) || isValidIsbn13(isbn);
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
  if (!/^\d{13}$/.test(isbn)) {
    return false;
  }

  const sum = [...isbn].reduce((current, character, index) => {
    const value = Number(character);

    return current + value * (index % 2 === 0 ? 1 : 3);
  }, 0);

  return sum % 10 === 0;
}
