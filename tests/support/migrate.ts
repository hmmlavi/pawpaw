import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export function loadMigrationStatements(): string[] {
  const sql = readFileSync(join(here, "drizzle-out", "0000_init.sql"), "utf8");
  return sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim().replace(/;$/, "").trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
}
