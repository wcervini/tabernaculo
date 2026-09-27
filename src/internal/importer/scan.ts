import { readdirSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { pathExists } from "../fsutil.ts";
import { frontmatterName } from "./frontmatter.ts";
import { normalizeName } from "./importer.ts";

/** Candidate es una skill detectable en una carpeta local. */
export interface Candidate {
  name: string; // nombre sugerido (normalizado)
  path: string; // path absoluto al origen (carpeta o fichero .md)
  isDir: boolean; // true si es carpeta, false si es .md suelto
}

/**
 * Busca skills importables en dir (no recursivo):
 *   - si dir contiene SKILL.md, la propia dir es la única candidata
 *   - si no, cada subcarpeta con SKILL.md (o con algún .md) y cada .md suelto
 *     es una candidata.
 * Omite ocultos, .git y node_modules.
 */
export function scanDir(dir: string): Candidate[] {
  const abs = resolve(dir);
  const st = statSync(abs); // lanza si no existe

  if (!st.isDirectory()) {
    if (abs.toLowerCase().endsWith(".md")) {
      return [{ name: normalizeName(basename(abs, extname(abs))), path: abs, isDir: false }];
    }
    const err: NodeJS.ErrnoException = new Error(`scan ${dir}: invalid argument`);
    err.code = "EINVAL";
    throw err;
  }

  if (pathExists(join(abs, "SKILL.md"))) {
    let label = normalizeName(basename(abs));
    const fm = frontmatterName(abs);
    if (fm) label = normalizeName(fm);
    return [{ name: label, path: abs, isDir: true }];
  }

  const infos = readdirSync(abs, { withFileTypes: true });
  const out: Candidate[] = [];
  for (const ino of infos) {
    const name = ino.name;
    if (name.startsWith(".") || name === "node_modules") continue;
    const p = join(abs, name);
    if (ino.isDirectory()) {
      if (name === ".git") continue;
      if (pathExists(join(p, "SKILL.md"))) {
        let label = normalizeName(name);
        const fm = frontmatterName(p);
        if (fm) label = normalizeName(fm);
        out.push({ name: label, path: p, isDir: true });
        continue;
      }
      // Carpeta con .md pero sin SKILL.md: importable (se envuelve).
      if (hasMD(p)) out.push({ name: normalizeName(name), path: p, isDir: true });
      continue;
    }
    if (name.toLowerCase().endsWith(".md")) {
      out.push({ name: normalizeName(basename(name, extname(name))), path: p, isDir: false });
    }
  }
  out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return out;
}

function hasMD(dir: string): boolean {
  let infos;
  try {
    infos = readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const ino of infos) {
    if (!ino.isDirectory() && ino.name.toLowerCase().endsWith(".md")) return true;
  }
  return false;
}
