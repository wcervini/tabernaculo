import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { list } from "../internal/store/store.ts";
import bashCompletion from "./completions/bash.txt";
import fishCompletion from "./completions/fish.txt";
import zshCompletion from "./completions/zsh.txt";

export function runCompletion(args: string[]): number {
  // Acepta --install antes o después de la shell (flag stdlib no mezcla).
  let install = false;
  const rest: string[] = [];
  for (const a of args) {
    if (a === "--install" || a === "--install=true") {
      install = true;
      continue;
    }
    rest.push(a);
  }
  if (rest.length !== 1 || rest[0] === "-h" || rest[0] === "--help") {
    process.stderr.write("uso: tabernaculo completion <bash|zsh|fish> [--install]\n");
    return 2;
  }

  const shell = rest[0]!.toLowerCase();
  let script: string;
  switch (shell) {
    case "bash":
      script = bashCompletion;
      break;
    case "zsh":
      script = zshCompletion;
      break;
    case "fish":
      script = fishCompletion;
      break;
    default:
      process.stderr.write("shell desconocida (usa bash, zsh o fish)\n");
      return 2;
  }

  if (!install) {
    process.stdout.write(script);
    return 0;
  }

  // --install: solo fish tiene ruta determinista.
  if (shell !== "fish") {
    process.stderr.write("para bash/zsh instala a mano:\n");
    process.stderr.write("  bash: tabernaculo completion bash | sudo tee /etc/bash_completion.d/tabernaculo\n");
    process.stderr.write("  zsh:  mkdir -p ~/.zfunc && tabernaculo completion zsh > ~/.zfunc/_tabernaculo\n");
    return 2;
  }

  let dir = process.env.XDG_CONFIG_HOME ?? "";
  if (!dir) {
    try {
      dir = homedir() + "/.config";
    } catch (e) {
      process.stderr.write(`error: no se pudo resolver home: ${(e as Error).message}\n`);
      return 1;
    }
  }
  const dest = `${dir}/fish/completions/tabernaculo.fish`;
  try {
    mkdirSync(`${dir}/fish/completions`, { recursive: true });
    writeFileSync(dest, script, "utf8");
  } catch (e) {
    process.stderr.write(`error: ${(e as Error).message}\n`);
    return 1;
  }
  console.log(`ok: ${dest}`);
  console.log('abre una shell nueva y prueba:  complete --do-complete="tabernaculo "');
  return 0;
}

/**
 * Imprime los nombres de skills del store, uno por línea.
 * Lo usan los scripts de autocompletado.
 */
export function runHiddenSkills(root: string): number {
  let entries;
  try {
    entries = list(root, "");
  } catch {
    return 1;
  }
  for (const e of entries) console.log(e.name);
  return 0;
}
