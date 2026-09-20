#!/usr/bin/env node
/**
 * Catches the bug that took aktivbruk.com's homepage down on 20. september 2026.
 *
 * A server component that imports a plain value from a "use client" module does
 * not receive the value. The RSC bundler replaces every export of a client
 * module with a client reference proxy, so `PAGE_SIZE - 1` became NaN and
 * `.range(0, NaN)` returned no rows. Nothing threw. The build was green, because
 * the route is dynamic and its code never ran during `next build`.
 *
 * Components are fine to import across the boundary, that is the whole point of
 * "use client". Everything else (constants, plain functions, objects) is not.
 *
 * Only modules actually reachable from a server entry point are checked, so a
 * helper used solely by client components is left alone.
 *
 * Run: npm run check:rsc
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const SRC = resolve(process.cwd(), "src");
const EXTS = [".ts", ".tsx"];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return EXTS.some((e) => full.endsWith(e)) ? [full] : [];
  });
}

/** "use client" must be the first statement, so only the head of the file matters. */
function isClientModule(file) {
  const head = readFileSync(file, "utf8").slice(0, 2000);
  const code = head
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .trimStart();
  return /^["']use client["']/.test(code);
}

function resolveImport(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else return null; // node_modules, not ours

  for (const ext of EXTS) {
    const candidate = base + ext;
    try { if (statSync(candidate).isFile()) return candidate; } catch {}
  }
  for (const ext of EXTS) {
    const candidate = join(base, "index" + ext);
    try { if (statSync(candidate).isFile()) return candidate; } catch {}
  }
  return null;
}

const IMPORT_RE = /import\s+(type\s+)?([\s\S]*?)\s*from\s*["']([^"']+)["']/g;

/** Returns the imported bindings, with type-only ones dropped: they are erased. */
function parseImports(source) {
  const out = [];
  for (const m of source.matchAll(IMPORT_RE)) {
    const [, typeOnly, clauseRaw, spec] = m;
    if (typeOnly) continue; // `import type { X } from` vanishes at compile time
    const clause = clauseRaw.trim();
    const names = [];

    const braced = clause.match(/\{([\s\S]*)\}/);
    if (braced) {
      for (const part of braced[1].split(",")) {
        const piece = part.trim();
        if (!piece || /^type\s/.test(piece)) continue; // inline `type X`
        names.push(piece.split(/\s+as\s+/)[0].trim());
      }
    }

    const star = clause.match(/\*\s+as\s+(\w+)/);
    if (star) names.push("* as " + star[1]);

    const def = clause.replace(/\{[\s\S]*\}/, "").replace(/\*\s+as\s+\w+/, "").split(",")[0].trim();
    if (def && /^\w+$/.test(def)) names.push(def);

    for (const name of names) out.push({ name, spec });
  }
  return out;
}

const isComponentName = (n) => /^[A-Z][A-Za-z0-9]*$/.test(n);

const files = walk(SRC);
const clientModules = new Set(files.filter(isClientModule));

// Server entry points: the App Router files Next runs on the server, plus
// middleware. A file marked "use client" is not one.
const SERVER_ENTRY = /(^|\/)(page|layout|template|default|route|sitemap|robots|opengraph-image|icon|apple-icon|error|not-found|global-error)\.tsx?$/;
const roots = files.filter(
  (f) =>
    !clientModules.has(f) &&
    (SERVER_ENTRY.test(f.replace(/\\/g, "/")) || /src[\\/]middleware\.tsx?$/.test(f)),
);

// Walk the server graph, stopping at the client boundary: a client module's own
// imports run in the browser, where plain values are plain values.
const serverGraph = new Set();
const queue = [...roots];
while (queue.length) {
  const file = queue.pop();
  if (serverGraph.has(file) || clientModules.has(file)) continue;
  serverGraph.add(file);
  for (const { spec } of parseImports(readFileSync(file, "utf8"))) {
    const target = resolveImport(spec, file);
    if (target && !serverGraph.has(target)) queue.push(target);
  }
}

const violations = [];
for (const file of serverGraph) {
  const source = readFileSync(file, "utf8");
  for (const { name, spec } of parseImports(source)) {
    const target = resolveImport(spec, file);
    if (!target || !clientModules.has(target)) continue;
    if (isComponentName(name)) continue; // a component is the supported case
    violations.push({
      file: relative(process.cwd(), file),
      name,
      from: relative(process.cwd(), target),
    });
  }
}

if (violations.length === 0) {
  console.log(`check:rsc  ok  (${serverGraph.size} server modules, ${clientModules.size} client modules)`);
  process.exit(0);
}

console.error("\ncheck:rsc  server code importing a non-component value from a client module:\n");
for (const v of violations) {
  console.error(`  ${v.file}`);
  console.error(`    imports \`${v.name}\` from ${v.from}  ("use client")`);
}
console.error(
  "\nOn the server these are client reference proxies, not the real values." +
  "\nArithmetic on them yields NaN and comparisons quietly fail, with nothing thrown." +
  "\nMove the value into a plain module (see src/lib/pagination.ts) and import it from both sides.\n",
);
process.exit(1);
