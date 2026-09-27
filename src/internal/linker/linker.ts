import { lstatSync, mkdirSync, realpathSync, symlinkSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { normalize as normalizeCli, targetBase, targetDir } from "../cliDefs/cli.ts";
import { resolveSkill } from "../store/store.ts";

/**
 * Crea <project>/<cliDir>/<skill> -> <store>/skills/<skill>.
 * La skill es genérica: se busca por nombre en el store plano (con fallback legacy).
 */
export function link(
  storeRoot: string,
  cli: string,
  skill: string,
  project: string,
  force: boolean,
  legacy: boolean,
): { target: string; source: string } {
  const key = normalizeCli(cli);
  const name = skillName(skill);
  const src = resolveSkill(storeRoot, name);
  const projAbs = resolve(project);
  const base = targetBase(projAbs, key, legacy);
  mkdirSync(base, { recursive: true });

  const target = join(base, name);
  const srcAbs = resolve(src);

  let lst;
  try {
    lst = lstatSync(target);
  } catch {
    lst = undefined;
  }

  if (lst) {
    if (lst.isSymbolicLink()) {
      let existing = "";
      try {
        existing = realpathSync(target);
      } catch {
        // symlink roto: se tratará como no coincidente
      }
      if (existing === srcAbs && !force) return { target, source: srcAbs }; // idempotente
      if (!force) throw new Error(`${target} ya es un symlink (usa --force para reemplazar)`);
      unlinkSync(target);
    } else {
      if (!force) {
        throw new Error(
          `${target} ya existe y no es symlink (usa --force solo si es fichero; nunca se borran directorios reales)`,
        );
      }
      if (lst.isDirectory()) {
        throw new Error(`${target} es un directorio real; bórralo a mano si quieres sustituirlo por symlink`);
      }
      unlinkSync(target);
    }
  }

  symlinkSync(srcAbs, target);
  return { target, source: srcAbs };
}

/** Borra el symlink del proyecto (solo si es symlink). */
export function unlink(project: string, cli: string, skill: string, legacy: boolean): void {
  const key = normalizeCli(cli);
  const projAbs = resolve(project);
  const target = targetDir(projAbs, key, skillName(skill), legacy);

  let st;
  try {
    st = lstatSync(target);
  } catch {
    throw new Error(`nada que quitar: ${target} no existe`);
  }
  if (!st.isSymbolicLink()) throw new Error(`${target} no es un symlink; no lo toco`);
  unlinkSync(target);
}

/** Indica si el target existe y a dónde apunta. */
export function status(
  project: string,
  cli: string,
  skill: string,
  legacy: boolean,
): { exists: boolean; isLink: boolean; dest: string } {
  const key = normalizeCli(cli);
  const projAbs = resolve(project);
  const target = targetDir(projAbs, key, skillName(skill), legacy);

  let st;
  try {
    st = lstatSync(target);
  } catch {
    return { exists: false, isLink: false, dest: "" };
  }
  if (!st.isSymbolicLink()) return { exists: true, isLink: false, dest: target };

  let dest = "";
  try {
    dest = realpathSync(target);
  } catch {
    dest = "";
  }
  return { exists: true, isLink: true, dest };
}

/** Normalización ligera de nombre (sin importar importer para evitar ciclo). */
function skillName(s: string): string {
  let out = "";
  for (const ch of s) {
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || ch === "-" || ch === "_") {
      out += ch;
    } else if (ch === " ") {
      out += "-";
    }
  }
  return out === "" ? s : out;
}
