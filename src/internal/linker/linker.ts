import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { normalize as normalizeCli, targetBase, targetDir } from "../cliDefs/cli.ts";
import { rfc3339 } from "../fsutil.ts";
import { resolveSkill } from "../store/store.ts";

/** Registro de una skill enlazada en el manifiesto del proyecto. */
export interface ManifestEntry {
  target: string; // destino real del symlink en el store
  linked_at: string; // RFC3339
}

/**
 * Manifiesto `.tabernaculo.json` dentro de <cliDir> (p. ej.
 * `<proyecto>/.opencode/skills/.tabernaculo.json`): referencia de qué skills
 * enlazó tabernáculo. Los symlinks son la fuente de verdad; el manifiesto solo
 * aporta contexto (origen, fecha, si la instaló tabernáculo).
 */
export interface Manifest {
  version: number;
  cli: string;
  project: string;
  skills: Record<string, ManifestEntry>;
}

/** Skill enlazada tal como se ofrece al usuario (link/unlink). */
export interface LinkedSkill {
  name: string;
  target: string; // destino real del symlink (la ruta del symlink si está roto)
  broken: boolean; // symlink presente pero destino inexistente
  managed: boolean; // registrada en .tabernaculo.json
}

/** Lee el manifiesto de un directorio de skills; vacío si no existe/no válido. */
function readManifestAt(base: string): Manifest {
  const empty: Manifest = { version: 1, cli: "", project: "", skills: {} };
  try {
    const parsed = JSON.parse(readFileSync(join(base, ".tabernaculo.json"), "utf8")) as Partial<Manifest>;
    return { ...empty, ...parsed, skills: parsed.skills ?? {} };
  } catch {
    return empty;
  }
}

/** Escribe el manifiesto en un directorio de skills (lo crea si hace falta). */
function writeManifestAt(base: string, m: Manifest): void {
  mkdirSync(base, { recursive: true });
  writeFileSync(join(base, ".tabernaculo.json"), JSON.stringify(m, null, 2) + "\n", "utf8");
}

/** Lee el manifiesto; si no existe o no es válido devuelve uno vacío. */
export function readManifest(project: string, cli: string, legacy: boolean): Manifest {
  const key = normalizeCli(cli);
  const projAbs = resolve(project);
  const empty: Manifest = { version: 1, cli: key, project: projAbs, skills: {} };
  const parsed = readManifestAt(targetBase(projAbs, key, legacy));
  return {
    ...empty,
    ...parsed,
    cli: parsed.cli || key,
    project: parsed.project || projAbs,
    skills: parsed.skills ?? {},
  };
}

/** Escribe el manifiesto (crea la carpeta del cli si hace falta). */
export function writeManifest(project: string, cli: string, legacy: boolean, m: Manifest): void {
  writeManifestAt(targetBase(resolve(project), normalizeCli(cli), legacy), m);
}

/** Registra/actualiza una skill enlazada en el manifiesto. */
export function recordLinked(project: string, cli: string, legacy: boolean, name: string, target: string): void {
  const m = readManifest(project, cli, legacy);
  m.skills[name] = { target, linked_at: rfc3339(new Date()) };
  writeManifest(project, cli, legacy, m);
}

/** Quita una skill del manifiesto (no falla si no estaba). */
export function forgetLinked(project: string, cli: string, legacy: boolean, name: string): void {
  const m = readManifest(project, cli, legacy);
  if (m.skills[name]) {
    delete m.skills[name];
    writeManifest(project, cli, legacy, m);
  }
}

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
      if (existing === srcAbs && !force) {
        // Idempotente: aseguramos que quede registrada en el manifiesto.
        recordLinked(projAbs, key, legacy, name, srcAbs);
        return { target, source: srcAbs };
      }
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
  recordLinked(projAbs, key, legacy, name, srcAbs);
  return { target, source: srcAbs };
}

/** Borra el symlink del proyecto (solo si es symlink). */
export function unlink(project: string, cli: string, skill: string, legacy: boolean): void {
  const key = normalizeCli(cli);
  const projAbs = resolve(project);
  const name = skillName(skill);
  const target = targetDir(projAbs, key, name, legacy);

  let st;
  try {
    st = lstatSync(target);
  } catch {
    throw new Error(`nada que quitar: ${target} no existe`);
  }
  if (!st.isSymbolicLink()) throw new Error(`${target} no es un symlink; no lo toco`);
  unlinkSync(target);
  forgetLinked(projAbs, key, legacy, name);
}

/**
 * Skills enlazadas en un directorio concreto (p. ej. `<proyecto>/.opencode/skills`).
 * **Siempre se verifica el sistema de archivos** (los symlinks son la fuente de
 * verdad); el manifiesto `.tabernaculo.json` solo aporta `managed`. Se
 * reconcilia: se eliminan del manifiesto las entradas cuyo symlink ya no existe
 * (p. ej. si el usuario lo borró a mano). Ordenadas; [] si el directorio no existe.
 */
export function listLinkedDir(base: string): LinkedSkill[] {
  const m = readManifestAt(base);

  let infos;
  try {
    infos = readdirSync(base, { withFileTypes: true });
  } catch {
    // Sin carpeta no hay nada instalado (y el manifiesto vive dentro de ella,
    // así que también desapareció): no recreamos nada.
    return [];
  }

  const out: LinkedSkill[] = [];
  const present = new Set<string>();
  for (const ino of infos) {
    if (ino.name.startsWith(".")) continue;
    if (!ino.isSymbolicLink()) continue;
    const linkPath = join(base, ino.name);
    let dest = "";
    let broken = false;
    try {
      dest = realpathSync(linkPath);
    } catch {
      broken = true;
      dest = linkPath;
    }
    present.add(ino.name);
    out.push({ name: ino.name, target: dest, broken, managed: ino.name in m.skills });
  }

  // Reconciliación: nada en el manifiesto que no exista como symlink real.
  let changed = false;
  for (const name of Object.keys(m.skills)) {
    if (!present.has(name)) {
      delete m.skills[name];
      changed = true;
    }
  }
  if (changed) writeManifestAt(base, m);

  out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return out;
}

/**
 * Skills enlazadas en el proyecto para un cli (ver `listLinkedDir`).
 * Ordenadas; [] si la carpeta no existe.
 */
export function listLinked(project: string, cli: string, legacy: boolean): LinkedSkill[] {
  const key = normalizeCli(cli);
  const base = targetBase(resolve(project), key, legacy);
  return listLinkedDir(base);
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
