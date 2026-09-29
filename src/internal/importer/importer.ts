import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { normalize as normalizeCli } from "../cliDefs/cli.ts";
import { copyDir, copyFile, isDir, pathExists, removeAll, rfc3339 } from "../fsutil.ts";
import type { Meta } from "../store/store.ts";
import { saveMeta, skillDir } from "../store/store.ts";
import { frontmatterName } from "./frontmatter.ts";

/** NormalizeName: minúsculas, espacios/_ -> -, solo [a-z0-9-]. */
export function normalizeName(s: string): string {
  s = s.toLowerCase().trim();
  s = s.replace(/ /g, "-").replace(/_/g, "-");
  let out = "";
  for (const ch of s) {
    if ((ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9") || ch === "-") out += ch;
  }
  out = out.replace(/^-+|-+$/g, "");
  while (out.includes("--")) out = out.replace(/--/g, "-");
  return out === "" ? "skill" : out;
}

/** Callback para elegir una skill cuando el origen contiene varias. */
export type SkillSelector = (names: string[]) => Promise<string>;

/** Opciones de importSkill (ver la ayuda de `import`). */
export interface ImportOptions {
  /** Path local, fichero .md, owner/repo o URL de GitHub. */
  from: string;
  /** Hint de con qué agent-CLI se importó (opcional). */
  cli?: string;
  /** Subruta dentro del repo/carpeta donde está la skill. */
  subPath?: string;
  /** Rama/tag del clon de GitHub. */
  ref?: string;
  /** Fuerza el nombre final en el store. */
  name?: string;
  /** Se usa solo si el origen contiene varias skills (menú interactivo). */
  select?: SkillSelector;
  /**
   * -D: exige la estructura convencional (carpeta = name del frontmatter con
   * SKILL.md en la raíz) y borra la carpeta origen tras importar bien.
   */
  deleteSource?: boolean;
  /** Pide confirmación antes de borrar (devuelve false para conservarla). */
  confirmDelete?: (dir: string) => boolean | Promise<boolean>;
}

/** Resultado de importSkill. */
export interface ImportResult {
  /** Nombre final en el store. */
  name: string;
  /** Carpeta origen borrada con -D ("" si no se borró nada). */
  removed: string;
  /** -D activo pero el usuario conservó el origen. */
  kept: boolean;
}

/**
 * Trae una skill al store (plano, sin cli: la skill es genérica).
 * cli es opcional y solo se guarda como hint en el meta.
 * from puede ser path local o github (URL u owner/repo).
 * select se usa solo si el origen tiene varias skills (menú interactivo).
 * Con deleteSource (-D) solo se acepta una carpeta local con la estructura
 * convencional; si algo falla, no se importa ni se borra nada.
 * Devuelve el nombre final en el store.
 */
export async function importSkill(storeRoot: string, opts: ImportOptions): Promise<ImportResult> {
  const { from, select, deleteSource = false, confirmDelete } = opts;
  const cli = opts.cli ?? "";
  const subPath = opts.subPath ?? "";
  const ref = opts.ref ?? "";
  const nameOverride = opts.name ?? "";

  const key = cli.trim() ? normalizeCli(cli) : "";
  if (!from.trim()) throw new Error("--from es obligatorio");
  if (deleteSource && nameOverride.trim()) {
    throw new Error("-D no se combina con --name: el nombre sale del frontmatter de SKILL.md");
  }

  const temps: string[] = [];
  const mkTmp = (prefix: string): string => {
    const t = mkdtempSync(join(tmpdir(), prefix));
    temps.push(t);
    return t;
  };

  try {
    let staging: string;
    let source: string;
    let urlOrPath: string;
    let fileBase = ""; // nombre base del fichero origen cuando --from es un .md suelto
    let deleteTarget = ""; // carpeta local a borrar con -D ("" si no aplica)

    let st;
    try {
      st = statSync(from);
    } catch {
      st = undefined;
    }

    if (st) {
      // Origen local.
      source = "local";
      urlOrPath = resolve(from);
      if (st.isDirectory()) {
        let p = from;
        if (subPath) p = join(from, subPath);
        if (!pathExists(p)) throw new Error(`subruta local no existe: ${p}`);
        staging = p;
        if (deleteSource) {
          if (subPath) throw new Error("-D no se combina con --path: apunta --from a la carpeta de la skill");
          deleteTarget = checkSkillFolder(resolve(from));
        }
      } else {
        if (deleteSource) {
          throw new Error(`-D solo funciona con una carpeta de skill, no con el fichero ${from}`);
        }
        // Fichero .md suelto: envolver.
        fileBase = basename(from, extname(from));
        const tmp = mkTmp("tabernaculo-");
        const wrap = join(tmp, "wrap");
        mkdirSync(wrap, { recursive: true });
        copyFile(from, join(wrap, "SKILL.md"));
        staging = wrap;
      }
    } else {
      // Origen github.
      if (deleteSource) {
        throw new Error(`-D solo funciona con una carpeta local de skill, no con ${from}`);
      }
      source = "github";
      urlOrPath = from;
      const repoURL = githubURL(from);
      const tmp = mkTmp("tabernaculo-");
      const cloneDir = join(tmp, repoNameFromURL(repoURL));
      const args = ["clone", "--depth", "1"];
      if (ref) args.push("--branch", ref);
      args.push(repoURL, cloneDir);
      const res = spawnSync("git", args, { stdio: "inherit" });
      if (res.error) throw new Error(`git clone falló (${repoURL}): ${res.error.message}`);
      if (res.status !== 0) throw new Error(`git clone falló (${repoURL}): exit ${res.status}`);
      staging = cloneDir;
      if (subPath) {
        staging = join(cloneDir, subPath);
        if (!pathExists(staging)) throw new Error(`subruta --path no existe en el repo: ${subPath}`);
      }
    }

    const { dir: skillSrc, wrapFirstMd } = await resolveSkillRoot(staging, select);

    let name = nameOverride;
    if (!name) {
      // Estándar Agent Skills: la carpeta debe llamarse igual que el campo
      // `name` del frontmatter. Si la carpeta origen trae sufijos (p. ej.
      // hashes de otros instaladores), el frontmatter manda.
      name = frontmatterName(skillSrc, wrapFirstMd ?? "SKILL.md");
      if (name && !fileBase) {
        const base = basename(skillSrc);
        if (normalizeName(base) !== normalizeName(name)) {
          process.stderr.write(
            `nota: carpeta origen ${JSON.stringify(base)} != name ${JSON.stringify(name)}; usando ${JSON.stringify(normalizeName(name))}\n`,
          );
        }
      }
    }
    if (!name) {
      if (fileBase) {
        name = fileBase;
      } else if (!isDir(staging)) {
        name = basename(staging, extname(staging));
      } else {
        name = basename(skillSrc);
        if (name === "." || name === "/") name = "skill";
      }
    }
    name = normalizeName(name);

    const dest = skillDir(storeRoot, name);
    if (pathExists(dest)) throw new Error(`skill ${name} ya existe en el store (usa --name otro)`);
    mkdirSync(dirname(dest), { recursive: true });
    try {
      copyDir(skillSrc, dest);
      // Carpeta con .md pero sin SKILL.md: se envuelve el primer .md como SKILL.md.
      if (wrapFirstMd) copyFile(join(skillSrc, wrapFirstMd), join(dest, "SKILL.md"));
    } catch (e) {
      rmSync(dest, { recursive: true, force: true });
      throw e;
    }

    const meta: Meta = {
      name,
      cli: key || undefined,
      source,
      url_or_path: urlOrPath,
      ref: ref || undefined,
      subpath: subPath || undefined,
      imported_at: rfc3339(new Date()),
    };
    saveMeta(dest, meta);

    // -D: la skill ya está copiada y con meta; ahora se borra el origen.
    let removed = "";
    let kept = false;
    if (deleteTarget) {
      if (!pathExists(deleteTarget)) {
        kept = true; // alguien lo movió mientras importábamos
      } else if (!confirmDelete || (await confirmDelete(deleteTarget))) {
        removeAll(deleteTarget);
        removed = deleteTarget;
      } else {
        kept = true;
      }
    }
    return { name, removed, kept };
  } finally {
    for (const t of temps) removeAll(t);
  }
}

/**
 * Comprueba que `dir` tiene la estructura convencional de una skill para poder
 * borrarla después (-D):
 *   <mi-skill>/SKILL.md          (obligatorio, en la raíz)
 *   <mi-skill>/scripts, references, assets, ...  (opcionales)
 * y que la carpeta se llama como el campo `name` del frontmatter.
 * Devuelve la ruta absoluta de la carpeta; si algo falla, lanza y no se
 * importa ni se borra nada.
 */
function checkSkillFolder(dir: string): string {
  if (!pathExists(join(dir, "SKILL.md"))) {
    throw new Error(`-D requiere la estructura convencional: ${dir} no tiene SKILL.md en la raíz`);
  }
  const base = basename(dir);
  const fm = frontmatterName(dir).trim();
  if (!fm) {
    throw new Error(`-D requiere que el frontmatter de ${join(dir, "SKILL.md")} declare "name"`);
  }
  if (normalizeName(base) !== normalizeName(fm)) {
    throw new Error(
      `-D requiere que la carpeta se llame como la skill: carpeta ${JSON.stringify(base)} != name ${JSON.stringify(fm)}`,
    );
  }
  // Cinturón de seguridad: nunca borrar rutas críticas aunque todo cuadre.
  const cwd = resolve(process.cwd());
  const home = resolve(homedir());
  if (dir === "/" || dir === cwd || dir === home) {
    throw new Error(`-D se niega a borrar ${dir} (ruta crítica)`);
  }
  return dir;
}

interface ResolvedSkill {
  dir: string;
  wrapFirstMd?: string;
}

/**
 * Localiza la carpeta que contiene SKILL.md. Si solo hay .md sueltos,
 * devuelve la propia staging y el primer .md para envolverlo como SKILL.md
 * (sin crear carpetas temporales intermedias). Si hay varias skills y se
 * pasa `select`, pide elegir una (menú); si no, lanza error.
 */
async function resolveSkillRoot(staging: string, select?: SkillSelector): Promise<ResolvedSkill> {
  if (pathExists(join(staging, "SKILL.md"))) return { dir: staging };

  const infos = readdirSync(staging, { withFileTypes: true });
  const skillSubdirs: string[] = [];
  const mdFiles: string[] = [];
  for (const ino of infos) {
    if (ino.isDirectory()) {
      if (pathExists(join(staging, ino.name, "SKILL.md"))) skillSubdirs.push(join(staging, ino.name));
      continue;
    }
    if (ino.name.toLowerCase().endsWith(".md")) mdFiles.push(ino.name);
  }

  if (skillSubdirs.length === 1) return { dir: skillSubdirs[0]! };
  if (skillSubdirs.length > 1) {
    const names = skillSubdirs.map((p) => basename(p)).sort();
    if (select) {
      const chosen = await select(names);
      if (!names.includes(chosen)) throw new Error(`selección inválida: ${JSON.stringify(chosen)}`);
      return { dir: join(staging, chosen) };
    }
    throw new Error(
      `el repo contiene varias skills (${names.join(", ")}); usa --path <sub/dir> o ejecútalo en una terminal interactiva`,
    );
  }
  if (mdFiles.length > 0) {
    mdFiles.sort();
    return { dir: staging, wrapFirstMd: mdFiles[0]! };
  }
  throw new Error(`no se encontró SKILL.md ni .md en ${staging} (usa --path a la carpeta de la skill)`);
}

/** Nombre del repo a partir de su URL (nombra el clon temporal). */
function repoNameFromURL(url: string): string {
  const clean = url.replace(/[#?].*$/, "").replace(/\/+$/, "");
  const base = (clean.split("/").pop() ?? "").replace(/\.git$/, "");
  return base || "repo";
}

function githubURL(from: string): string {
  if (from.startsWith("http://") || from.startsWith("https://") || from.startsWith("git@")) return from;
  // owner/repo
  const parts = from.replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length === 2) return `https://github.com/${parts[0]}/${parts[1]}.git`;
  return from;
}
