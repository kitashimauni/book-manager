import { readFile, writeFile } from "node:fs/promises";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error("Usage: node generate-ndc9-data.mjs <ndc9.ttl> <output.ts>");
  process.exit(1);
}

const turtle = await readFile(inputPath, "utf8");
const entries = new Map();

for (const rawStatement of turtle.split(/\r?\n\.\s*(?:\r?\n|$)/)) {
  const statement = rawStatement.trim();
  const subjectMatch = /^ndc9:([^\s]+)\s/.exec(statement);

  if (!subjectMatch) {
    continue;
  }

  const notation = readLiteral(statement, "skos:notation");

  if (!notation) {
    continue;
  }

  const label = readLiteral(statement, "rdfs:label") ?? readJapanesePrefLabel(statement);
  const broader = [...statement.matchAll(/skos:broader\s+([^;]+)/g)].flatMap((match) =>
    [...(match[1] ?? "").matchAll(/ndc9:([^\s,;]+)/g)].map((nestedMatch) => nestedMatch[1])
  );
  const existing = entries.get(notation);
  const entry = existing ?? { broader: [] };

  if (!entry.label && label) {
    entry.label = label;
  }

  entry.broader = [...new Set([...(entry.broader ?? []), ...broader])];
  entries.set(notation, entry);
}

const data = Object.fromEntries(
  [...entries.entries()].sort(([left], [right]) => left.localeCompare(right, "en"))
);

const output = `// Generated from the JLA NDC9 Linked Data Turtle distribution. Do not edit manually.\nexport const ndc9Entries = ${JSON.stringify(data, null, 2)};\n`;
await writeFile(outputPath, output, "utf8");
console.log(`Generated ${entries.size} NDC9 entries at ${outputPath}`);

function readLiteral(statement, predicate) {
  const escapedPredicate = predicate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escapedPredicate}\\s+"((?:\\\\.|[^"\\\\])*)"`, "u").exec(statement);

  return match ? decodeTurtleString(match[1]) : undefined;
}

function readJapanesePrefLabel(statement) {
  const escapedPredicate = "skos:prefLabel";
  const match = new RegExp(
    `${escapedPredicate}\\s+"((?:\\\\.|[^"\\\\])*)"@ja`,
    "u"
  ).exec(statement);

  return match ? decodeTurtleString(match[1]) : undefined;
}

function decodeTurtleString(value) {
  return value
    .replace(/\\u([0-9a-f]{4})/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
    .replace(/\\U([0-9a-f]{8})/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
    .replace(/\\([\\"])/g, "$1");
}
