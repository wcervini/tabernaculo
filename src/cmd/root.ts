import { list as listClis } from "../internal/cliDefs/cli.ts";
import { ensureConfig, resolveStore } from "../internal/config/config.ts";
import { importSkill } from "../internal/importer/importer.ts";
import { link, unlink } from "../internal/linker/linker.ts";
import { list as listStore, remove, skillDir } from "../internal/store/store.ts";
import { runCompletion, runHiddenSkills } from "./completion.ts";
import { runConfig } from "./config.ts";
import { flagUsage, parseCmd } from "./flags.ts";
import { commandHelp } from "./help.ts";
import { pickFromList, pickSkillFromNames } from "./pick.ts";
import { runScan } from "./scan.ts";

function usage(): void {
  process.stderr.write(`tabernaculo — gestor de skills para agent-CLIs

Uso:
  tabernaculo <comando> [flags]

Comandos:
  import   importa skill desde path local o GitHub (menú si trae varias)
  scan     explora carpeta local y deja elegir qué importar
  list     lista skills del store
  link     enlaza skill del store a un proyecto (symlink)
  unlink   quita el symlink del proyecto
  remove   borra una skill del store
  clis     muestra los agent-CLIs soportados
  config   muestra/edita el store por defecto (config.json)
  completion genera script de autocompletado (bash|zsh|fish)
  help     ayuda general o detallada (help <comando>, o <comando> --help)

Global:
  --store  ruta del store (default: config.json o ~/.local/tabernaculo)
`);
}

/** Ejecuta el subcomando. Devuelve código de salida. */
export async function dispatch(argv: string[]): Promise<number> {
  // Flag global --store puede venir antes del subcomando.
  let storeFlag = "";
  const rest = [...argv];
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--store" && i + 1 < rest.length) {
      storeFlag = rest[i + 1]!;
      rest.splice(i, 2);
      break;
    }
    if (rest[i]!.startsWith("--store=")) {
      storeFlag = rest[i]!.slice(8);
      rest.splice(i, 1);
      break;
    }
  }

  if (rest.length === 0) {
    usage();
    return 2;
  }

  const cmd = rest[0]!;
  // Ayuda: "help [comando]" o "<comando> --help|-h". No toca el store ni el
  // config (se resuelve antes de ensureConfig).
  if (cmd === "help") {
    const target = rest[1];
    if (!target) {
      usage();
      return 0;
    }
    const text = commandHelp(target);
    if (!text) {
      process.stderr.write(`comando desconocido: ${target}\n`);
      usage();
      return 2;
    }
    process.stdout.write(text);
    return 0;
  }
  if (rest.slice(1).some((a) => a === "-h" || a === "--help")) {
    const text = commandHelp(cmd);
    if (text) {
      process.stdout.write(text);
      return 0;
    }
  }

  const resolved = resolveStore(storeFlag);
  ensureConfig();
  const root = resolved.root;
  switch (cmd) {
    case "import":
      return runImport(root, rest.slice(1));
    case "scan":
      return await runScan(root, rest.slice(1));
    case "list":
      return runList(root, rest.slice(1));
    case "link":
      return await runLink(root, rest.slice(1));
    case "unlink":
      return runUnlink(root, rest.slice(1));
    case "remove":
    case "rm":
    case "delete":
      return runRemove(root, rest.slice(1));
    case "clis":
    case "supported-clis":
      for (const c of listClis()) console.log(c);
      return 0;
    case "config":
      return runConfig(resolved, rest.slice(1));
    case "completion":
      return runCompletion(rest.slice(1));
    case "__skills":
      return runHiddenSkills(root);
    case "-h":
    case "--help":
      usage();
      return 0;
    default:
      process.stderr.write(`comando desconocido: ${cmd}\n`);
      usage();
      return 2;
  }
}

async function runImport(root: string, args: string[]): Promise<number> {
  let flags: Record<string, string | boolean>;
  try {
    flags = parseCmd(args, { string: ["cli", "from", "path", "ref", "name"] });
  } catch (e) {
    return flagUsage(e);
  }
  const from = flags.from as string;
  if (!from) {
    process.stderr.write("import requiere --from\n");
    return 2;
  }
  // Si el origen trae varias skills, se ofrece un menú (solo en terminal).
  const select = process.stdin.isTTY ? pickSkillFromNames : undefined;
  try {
    const got = await importSkill(
      root,
      flags.cli as string,
      from,
      flags.path as string,
      flags.ref as string,
      flags.name as string,
      select,
    );
    console.log(`ok: ${got} -> ${skillDir(root, got)}`);
    return 0;
  } catch (e) {
    process.stderr.write(`error: ${(e as Error).message}\n`);
    return 1;
  }
}

function runList(root: string, args: string[]): number {
  let flags: Record<string, string | boolean>;
  try {
    flags = parseCmd(args, { string: ["cli"] });
  } catch (e) {
    return flagUsage(e);
  }
  let entries;
  try {
    entries = listStore(root, flags.cli as string);
  } catch (e) {
    process.stderr.write(`error: ${(e as Error).message}\n`);
    return 1;
  }
  if (entries.length === 0) {
    console.log("(store vacío)");
    return 0;
  }
  for (const e of entries) console.log(e.name);
  return 0;
}

async function runLink(root: string, args: string[]): Promise<number> {
  let flags: Record<string, string | boolean>;
  try {
    flags = parseCmd(args, { string: ["cli", "project", "skill"], boolean: ["force", "legacy"] });
  } catch (e) {
    return flagUsage(e);
  }
  const cli = flags.cli as string;
  const project = flags.project as string;
  let skill = flags.skill as string;
  if (!cli || !project) {
    process.stderr.write("link requiere --cli y --project\n");
    return 2;
  }
  if (!skill) {
    try {
      skill = await pickFromList(root, "");
    } catch (e) {
      process.stderr.write(`error: ${(e as Error).message}\n`);
      return 1;
    }
  }
  try {
    const { target, source } = link(root, cli, skill, project, flags.force as boolean, flags.legacy as boolean);
    console.log(`ok: ${target} -> ${source}`);
    return 0;
  } catch (e) {
    process.stderr.write(`error: ${(e as Error).message}\n`);
    return 1;
  }
}

function runUnlink(root: string, args: string[]): number {
  void root;
  let flags: Record<string, string | boolean>;
  try {
    flags = parseCmd(args, { string: ["cli", "project", "skill"], boolean: ["legacy"] });
  } catch (e) {
    return flagUsage(e);
  }
  const cli = flags.cli as string;
  const project = flags.project as string;
  const skill = flags.skill as string;
  if (!cli || !project || !skill) {
    process.stderr.write("unlink requiere --cli, --project y --skill\n");
    return 2;
  }
  try {
    unlink(project, cli, skill, flags.legacy as boolean);
    console.log("ok: enlace eliminado");
    return 0;
  } catch (e) {
    process.stderr.write(`error: ${(e as Error).message}\n`);
    return 1;
  }
}

function runRemove(root: string, args: string[]): number {
  let flags: Record<string, string | boolean>;
  try {
    flags = parseCmd(args, { string: ["skill"] });
  } catch (e) {
    return flagUsage(e);
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
  } catch (e) {
    process.stderr.write(`error: ${(e as Error).message}\n`);
    return 1;
  }
}
