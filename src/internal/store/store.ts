import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { normalize as normalizeCli } from "../cliDefs/cli.ts";
import { resolveStore } from "../config/config.ts";
import { isDir, pathExists } from "../fsutil.ts";

/**
 * Meta se guarda como .tabernaculo.json dentro de cada skill importada.
 * cli es solo orientativo (con qué agent-CLI se importó); la skill es
 * genérica y puede enlazarse a cualquier agent-CLI.
 */
export interface Meta {
  name: string;
  cli?: string;
  source: string; // "local" | "github"
  url_or_path: string;
  ref?: string;
  subpath?: string;
  imported_at: string;
}

/** Entry es una skill listada. */
export interface Entry {
  cli: string; // origen orientativo (meta) o "any"; en layout legacy es el <cli> anidado
  name: string;
  path: string;
}

/**
 * Resolución del store (delegada a config/config.ts):
 * --store > $TABERNACULO_HOME > $TABERNACULO_STORE > config.json >
 * ~/.local/tabernaculo.
 */
export function resolveRoot(explicit: string): string {
  return resolveStore(explicit).root;
}

/**
 * Carpeta donde viven las skills. Acepta dos layouts:
 *  1. `<root>/skills` si existe (layout actual; default ~/.local/tabernaculo).
 *  2. El propio `<root>` si es un repo de skills directo (carpetas con
 *     SKILL.md en la raíz, p. ej. ~/.skills).
 * Si no hay nada, asume el layout actual (`<root>/skills`).
 */
export function skillsBase(root: string): string {
  const sub = join(root, "skills");
  if (isDir(sub)) return sub;
  if (looksLikeSkillsRepo(root)) return root;
  return sub;
}

/** true si el directorio parece un repo de skills (≥1 subcarpeta con SKILL.md). */
function looksLikeSkillsRepo(dir: string): boolean {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return false;
  }
  for (const e of entries) {
    if (e.startsWith(".") || e === "skills") continue;
    if (isDir(join(dir, e)) && pathExists(join(dir, e, "SKILL.md"))) return true;
  }
  return false;
}

/** <root>/skills/<name> (plano, sin cli: la skill es genérica). */
export function skillDir(root: string, name: string): string {
  return join(skillsBase(root), name);
}

/** <root>/skills/<cli>/<name> (formato anterior, solo lectura/migración). */
export function legacySkillDir(root: string, cli: string, name: string): string {
  return join(skillsBase(root), cli, name);
}

/** Ruta del meta dentro de la skill. */
export function metaPath(dir: string): string {
  return join(dir, ".tabernaculo.json");
}

/** Escribe el meta.json. */
export function saveMeta(dir: string, m: Meta): void {
  writeFileSync(metaPath(dir), JSON.stringify(m, null, 2), "utf8");
}

/** Lee el meta si existe; si no, devuelve un Meta vacío sin error. */
export function readMeta(dir: string): Meta {
  const empty: Meta = { name: "", source: "", url_or_path: "", imported_at: "" };
  try {
    const parsed = JSON.parse(readFileSync(metaPath(dir), "utf8")) as Partial<Meta>;
    return { ...empty, ...parsed };
  } catch {
    return empty;
  }
}

/**
 * Localiza la skill por nombre: primero layout plano, después layout
 * legacy <cli>/<name> (cualquier cli).
 */
export function resolveSkill(root: string, name: string): string {
  const clean = name.trim();
  if (!clean) throw new Error("nombre de skill vacío");
  const flat = skillDir(root, clean);
  if (isDir(flat)) return flat;

  let clis;
  try {
    clis = readdirSync(skillsBase(root), { withFileTypes: true });
  } catch {
    throw new Error(`skill ${JSON.stringify(clean)} no está en el store`);
  }
  for (const c of clis) {
    if (!c.isDirectory() || c.name.startsWith(".")) continue;
    const cand = join(skillsBase(root), c.name, clean);
    if (isDir(cand) && (pathExists(join(cand, "SKILL.md")) || pathExists(metaPath(cand)))) {
      return cand;
    }
  }
  throw new Error(`skill ${JSON.stringify(clean)} no está en el store`);
}

/**
 * Skills del layout plano + legacy (sin duplicados, gana plano).
 * Si cliFilter != "", filtra por meta.cli (plano) o por carpeta <cli> (legacy).
 */
export function list(root: string, cliFilter: string): Entry[] {
  let key = "";
  if (cliFilter) key = normalizeCli(cliFilter);

  const base = skillsBase(root);
  let infos;
  try {
    infos = readdirSync(base, { withFileTypes: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }

  const seen = new Set<string>();
  const out: Entry[] = [];

  // 1) Plano: <base>/<name> con SKILL.md o meta.
  for (const ino of infos) {
    if (!ino.isDirectory() || ino.name.startsWith(".")) continue;
    const dir = join(base, ino.name);
    const hasSkill = pathExists(join(dir, "SKILL.md")) || pathExists(metaPath(dir));
    if (!hasSkill) continue; // podría ser carpeta <cli> del layout legacy; se procesa abajo
    const m = readMeta(dir);
    const cliLabel = m.cli || "any";
    if (key && m.cli && m.cli !== key) continue;
    out.push({ cli: cliLabel, name: ino.name, path: dir });
    seen.add(ino.name);
  }

  // 2) Legacy: <base>/<cli>/<name>.
  for (const c of infos) {
    if (!c.isDirectory() || c.name.startsWith(".")) continue;
    if (seen.has(c.name)) continue; // colisión improbable; el plano gana
    let sub;
    try {
      sub = readdirSync(join(base, c.name), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const s of sub) {
      if (!s.isDirectory() || s.name.startsWith(".") || seen.has(s.name)) continue;
      const cand = join(base, c.name, s.name);
      if (!pathExists(join(cand, "SKILL.md")) && !pathExists(metaPath(cand))) continue;
      if (key && c.name !== key) continue;
      out.push({ cli: c.name, name: s.name, path: cand });
      seen.add(s.name);
    }
  }

  out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return out;
}

/** true si la skill ya está en el store (plano o legacy). */
export function exists(root: string, name: string): boolean {
  try {
    resolveSkill(root, name);
    return true;
  } catch {
    return false;
  }
}

/** Borra una skill del store (plano o legacy). */
export function remove(root: string, name: string): void {
  const dir = resolveSkill(root, name);
  rmSync(dir, { recursive: true, force: true });
}
