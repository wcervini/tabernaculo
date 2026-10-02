import { VERSION } from "../version.ts";
import { list as listClis } from "../internal/cliDefs/cli.ts";
import { ensureConfig, resolveStore } from "../internal/config/config.ts";
import { runCompletion, runHiddenSkills } from "./completion.ts";
import { runConfig } from "./config.ts";
import { commandHelp } from "./help.ts";
import { runScan } from "./scan.ts";
import { runImport, runLink, runList, runRemove, runUnlink } from "./skills.ts";

function usage(): void {
  process.stderr.write(`tabernaculo — gestor de skills para agent-CLIs

Uso:
  tabernaculo <comando> [flags]

Comandos:
  import   importa skill desde path local o GitHub (menú si trae varias)
  scan     explora carpeta local y deja elegir qué importar
  list     lista skills instaladas en el proyecto (CWD); store con --available
  link     enlaza skill del store a un proyecto (symlink)
  unlink   quita el symlink del proyecto
  remove   borra una skill del store
  clis     muestra los agent-CLIs soportados
  config   muestra/edita el store por defecto (config.json)
  completion genera script de autocompletado (bash|zsh|fish)
  help     ayuda general o detallada (help <comando>, o <comando> --help)
  version  muestra la versión de tabernaculo

Global:
  --store    ruta del store (default: config.json o ~/.local/tabernaculo)
  -v, --version  versión de tabernaculo
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
  // Versión: "version", "-v" o "--version". No toca el store ni el config.
  if (cmd === "version" || cmd === "-v" || cmd === "--version") {
    process.stdout.write(`tabernaculo ${VERSION}\n`);
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
      return await runImport(root, rest.slice(1));
    case "scan":
      return await runScan(root, rest.slice(1));
    case "list":
      return runList(root, rest.slice(1));
    case "link":
      return await runLink(root, rest.slice(1));
    case "unlink":
      return await runUnlink(root, rest.slice(1));
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
