const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = process.cwd();
const files = [];
const failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) files.push(file);
  }
}

function resolveLocal(importer, specifier) {
  const base = specifier.startsWith("@/")
    ? path.join(root, specifier.slice(2))
    : path.resolve(path.dirname(importer), specifier);
  return [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")].some(fs.existsSync);
}

walk(root);
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
  });
  for (const diagnostic of output.diagnostics || []) {
    if (diagnostic.category === ts.DiagnosticCategory.Error) failures.push(`${path.relative(root, file)}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
  }
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  parsed.forEachChild((node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      if ((specifier.startsWith("@/") || specifier.startsWith(".")) && !resolveLocal(file, specifier)) failures.push(`${path.relative(root, file)}: unresolved local import ${specifier}`);
    }
  });
}

const required = [
  "app/[locale]/(auth)/login/page.tsx",
  "app/[locale]/(dashboard)/page.tsx",
  "app/api/bff/[...path]/route.ts",
  "components/shell/DashboardShell.tsx",
  "lib/api/endpoints.ts",
  "Dockerfile",
  "docker-compose.yml",
  ".env.example"
];
for (const relative of required) if (!fs.existsSync(path.join(root, relative))) failures.push(`missing required file: ${relative}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ typescript_files: files.length, syntax_errors: 0, unresolved_local_imports: 0, required_files: required.length }, null, 2));
