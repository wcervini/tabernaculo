import { resolve } from "node:path";
import { dirs as cliDirs } from "../internal/cliDefs/cli.ts";
import { importSkill } from "../internal/importer/importer.ts";
import { link, listLinked, listLinkedDir, unlink } from "../internal/linker/linker.ts";
import { list as listStore, remove, skillDir } from "../internal/store/store.ts";
import { flagUsage, parseCmd } from "./flags.ts";
import {
  canPrompt,
  confirmDeleteDir,
  pickSkillsFromList,
  pickSkillsFromNames,
  selectMany,
  SelectionCancelled,
} from "./pick.ts";

/** Importa una skill desde una ruta local o GitHub. */
export async function runImport(root: string, args: string[]): Promise<number> {
  let flags: Record<string, string | boolean>;
  try {
    flags = parseCmd(args, {
      string: ["cli", "from", "path", "ref", "name"],
      boolean: ["D", "delete-source"],
    });
  } catch (error) {
    return flagUsage(error);
  }

  const from = flags.from as string;
  if (!from) {
    process.stderr.write("import requiere --from\n");
    return 2;
  }

  const selectSkill = canPrompt() ? pickSkillsFromNames : undefined;

  try {
    const imported = await importSkill(root, {
      from,
      cli: flags.cli as string,
      subPath: flags.path as string,
      ref: flags.ref as string,
      name: flags.name as string,
      select: selectSkill,
      deleteSource: Boolean(flags.D || flags["delete-source"]),
      confirmDelete: confirmDeleteDir,
    });

    for (const got of imported) {
      console.log(`ok: ${got.name} -> ${skillDir(root, got.name)}`);
      if (got.removed) console.log(`ok: origen borrado: ${got.removed}`);
      else if (got.kept) console.log(`aviso: origen conservado: ${resolve(from)}`);
    }
    return 0;
  } catch (error) {
    if (error instanceof SelectionCancelled) {
      console.log("(cancelado: no se importó nada)");
      return 0;
    }
    process.stderr.write(`error: ${(error as Error).message}\n`);
    return 1;
  }
}

/**
 * Lista las skills instaladas en un proyecto (por defecto el CWD), o las del
 * store con `--available`. Marca los enlaces rotos.
 */
export function runList(root: string, args: string[]): number {
  let flags: Record<string, string | boolean>;
  try {
    flags = parseCmd(args, { string: ["cli", "project"], boolean: ["legacy", "available"] });
  } catch (error) {
    return flagUsage(error);
  }

  const cli = flags.cli as string;
  const project = (flags.project as string) || process.cwd();

  try {
    if (flags.available) {
      const entries = listStore(root, cli);
      if (entries.length === 0) {
        console.log("(store vacío)");
        return 0;
      }
      for (const entry of entries) console.log(entry.name);
      return 0;
    }
    return listInstalled(project, cli, flags.legacy as boolean);
  } catch (error) {
    process.stderr.write(`error: ${(error as Error).message}\n`);
    return 1;
  }
}

/**
 * Lista las skills instaladas (symlinks) en un proyecto. Con --cli solo ese
 * agent-CLI; sin él, agrupa por directorio destino. Marca los enlaces rotos.
 */
function listInstalled(project: string, cli: string, legacy: boolean): number {
  const projAbs = resolve(project);

  if (cli) {
    const linked = listLinked(project, cli, legacy);
    if (linked.length === 0) {
      console.log(`(sin skills enlazadas para ${JSON.stringify(cli)} en ${projAbs})`);
      return 0;
    }
    for (const l of linked) console.log(l.broken ? `${l.name} (enlace roto)` : l.name);
    return 0;
  }

  let total = 0;
  for (const dir of cliDirs()) {
    const linked = listLinkedDir(resolve(projAbs, dir));
    if (linked.length === 0) continue;
    console.log(`${dir}:`);
    for (const l of linked) {
      console.log(`  ${l.broken ? `${l.name} (enlace roto)` : l.name}`);
      total++;
    }
  }
  if (total === 0) console.log(`(sin skills enlazadas en ${projAbs})`);
  return 0;
}

/** Enlaza una skill del store al directorio de un proyecto. */
export async function runLink(root: string, args: string[]): Promise<number> {
  let flags: Record<string, string | boolean>;
  try {
    flags = parseCmd(args, {
      string: ["cli", "project", "skill"],
      boolean: ["force", "legacy"],
    });
  } catch (error) {
    return flagUsage(error);
  }

  const cli = flags.cli as string;
  // --project es opcional: sin él se opera sobre el directorio actual (CWD).
  const project = (flags.project as string) || process.cwd();
  const skill = flags.skill as string;

  if (!cli) {
    process.stderr.write("link requiere --cli\n");
    return 2;
  }

  // Sin --skill: checkbox con las skills del store que aún NO están
  // enlazadas en este proyecto (las ya enlazadas no se ofrecen).
  let skills: string[];
  if (skill) {
    skills = [skill];
  } else {
    if (!canPrompt()) {
      process.stderr.write("link sin --skill requiere una terminal; indica --skill <nombre>\n");
      return 2;
    }
    try {
      const linked = new Set(listLinked(project, cli, flags.legacy as boolean).map((l) => l.name));
      skills = await pickSkillsFromList(root, "", linked);
    } catch (error) {
      if (error instanceof SelectionCancelled) {
        console.log("(cancelado: no se enlazó nada)");
        return 0;
      }
      process.stderr.write(`error: ${(error as Error).message}\n`);
      return 1;
    }
  }

  let ok = 0;
  let fail = 0;
  for (const s of skills) {
    try {
      const result = link(root, cli, s, project, flags.force as boolean, flags.legacy as boolean);
      console.log(`ok: ${result.target} -> ${result.source}`);
      ok++;
    } catch (error) {
      console.log(`x ${s}: ${(error as Error).message}`);
      fail++;
    }
  }
  return fail > 0 ? 1 : 0;
}

/** Quita del proyecto el symlink de una o varias skills. */
export async function runUnlink(_root: string, args: string[]): Promise<number> {
  let flags: Record<string, string | boolean>;
  try {
    flags = parseCmd(args, {
      string: ["cli", "project", "skill"],
      boolean: ["legacy"],
    });
  } catch (error) {
    return flagUsage(error);
  }

  const cli = flags.cli as string;
  // --project es opcional: sin él se opera sobre el directorio actual (CWD).
  const project = (flags.project as string) || process.cwd();
  const skill = flags.skill as string;
  const legacy = flags.legacy as boolean;

  if (!cli) {
    process.stderr.write("unlink requiere --cli\n");
    return 2;
  }

  // Sin --skill: checkbox con las skills enlazadas en el proyecto.
  let skills: string[];
  if (skill) {
    skills = [skill];
  } else {
    if (!canPrompt()) {
      process.stderr.write("unlink sin --skill requiere una terminal; indica --skill <nombre>\n");
      return 2;
    }
    const linked = listLinked(project, cli, legacy);
    if (linked.length === 0) {
      process.stderr.write(`no hay skills enlazadas para ${cli} en ${resolve(project)}\n`);
      return 1;
    }
    try {
      skills = await selectMany(
        "Elige las skills a quitar (espacio marca, enter confirma)",
        linked.map((l) => ({
          name: l.broken ? `${l.name} (enlace roto)` : l.name,
          value: l.name,
          description: l.managed ? "instalada con tabernáculo" : "symlink externo",
        })),
        { cancel: true },
      );
    } catch (error) {
      if (error instanceof SelectionCancelled) {
        console.log("(cancelado: no se quitó nada)");
        return 0;
      }
      process.stderr.write(`error: ${(error as Error).message}\n`);
      return 1;
    }
  }

  let ok = 0;
  let fail = 0;
  for (const s of skills) {
    try {
      unlink(project, cli, s, legacy);
      console.log(`ok: enlace eliminado: ${s}`);
      ok++;
    } catch (error) {
      console.log(`x ${s}: ${(error as Error).message}`);
      fail++;
    }
  }
  return fail > 0 ? 1 : 0;
}

/** Elimina una skill del store. */
export function runRemove(root: string, args: string[]): number {
  let flags: Record<string, string | boolean>;
  try {
    flags = parseCmd(args, { string: ["skill"] });
  } catch (error) {
    return flagUsage(error);
  }

  const skill = flags.skill as string;
  if (!skill) {
    process.stderr.write("remove requiere --skill\n");
    return 2;
  }

  try {
    remove(root, skill);
    console.log("ok: skill eliminada del store");
    return 0;
  } catch (error) {
    process.stderr.write(`error: ${(error as Error).message}\n`);
    return 1;
  }
}
