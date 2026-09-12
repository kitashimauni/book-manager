import { ndc9Entries } from "../data/ndc9.js";

export type Ndc9Entry = {
  label?: string;
  broader: readonly string[];
};

export type Ndc9Catalog = Record<string, Ndc9Entry>;

const ndc9CodePattern = /^\d{1,3}(?:\.\d+)?$/;

export function normalizeNdc9Code(value: string): string | undefined {
  const normalized = value.normalize("NFKC").trim();

  return ndc9CodePattern.test(normalized) ? normalized : undefined;
}

export function resolveNdc9Label(
  rawCode: string,
  catalog: Ndc9Catalog = ndc9Entries
): string | undefined {
  const code = normalizeNdc9Code(rawCode);

  if (!code) {
    return undefined;
  }

  const visited = new Set<string>();
  const pending = [code];

  while (pending.length > 0) {
    const currentCode = pending.shift();

    if (!currentCode || visited.has(currentCode)) {
      continue;
    }

    visited.add(currentCode);
    const entry = catalog[currentCode];

    if (!entry) {
      continue;
    }

    if (entry.label?.trim()) {
      return entry.label;
    }

    pending.push(...entry.broader);
  }

  return undefined;
}
