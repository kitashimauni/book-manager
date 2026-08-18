export function appendVolumeMetadata(title: string, ...metadata: Array<string | undefined>) {
  const normalizedTitle = normalizeText(title);
  const additions = uniqueMetadata(metadata)
    .filter((value) => !containsMetadata(normalizedTitle, value))
    .join(" ");

  return additions ? `${normalizedTitle} ${additions}` : normalizedTitle;
}

function uniqueMetadata(values: Array<string | undefined>) {
  const seen = new Set<string>();

  return values
    .map((value) => normalizeText(value ?? ""))
    .filter((value) => {
      if (!value || seen.has(value.toLocaleLowerCase())) {
        return false;
      }

      seen.add(value.toLocaleLowerCase());
      return true;
    });
}

function normalizeText(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function containsMetadata(title: string, metadata: string): boolean {
  const normalizedTitle = title.toLocaleLowerCase();
  const normalizedMetadata = metadata.toLocaleLowerCase();
  let searchStart = 0;

  while (true) {
    const index = normalizedTitle.indexOf(normalizedMetadata, searchStart);

    if (index < 0) {
      return false;
    }

    const before = normalizedTitle[index - 1];
    const after = normalizedTitle[index + normalizedMetadata.length];

    if (!isWordCharacter(before) && !isWordCharacter(after)) {
      return true;
    }

    searchStart = index + normalizedMetadata.length;
  }
}

function isWordCharacter(value: string | undefined): boolean {
  return value ? /[\p{L}\p{N}]/u.test(value) : false;
}
