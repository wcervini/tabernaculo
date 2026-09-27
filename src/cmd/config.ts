import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ResolvedStore } from "../internal/config/config.ts";
import { configPath, defaultStore, expandHome, originLabel, readConfig, writeConfig } from "../internal/config/config.ts";
import { skillsBase } from "../internal/store/store.ts";
import { flagUsage, parseCmd } from "./flags.ts";

/**
 * `tabernaculo config`            muestra store, origen y ruta del archivo.
 * `tabernaculo config --set <r>`  guarda la ruta del store en config.json.
 */
export function runConfig(resolved: ResolvedStore, args: string[]): number {
  let flags: Record<string, string | boolean>;
  try {
    flags = parseCmd(args, { string: ["set"] });
  } catch (e) {
    return flagUsage(e);
  }

  const set = (flags.set as string).trim();
  if (set) {
    const store = resolve(expandHome(set));
    writeConfig({ store });
    console.log(`ok: config guardada -> ${configPath()}`);
    console.log(`store: ${store}`);
    return 0;
  }

  const file = configPath();
  const cfg = readConfig();
  console.log(`config:  ${file} (${existsSync(file) ? "existe" : "no existe"})`);
  if (cfg.store) console.log(`archivo: store = ${cfg.store}`);
  console.log(`store:   ${resolved.root}`);
  console.log(`origen:  ${originLabel(resolved.origin)}`);
  console.log(`skills:  ${skillsBase(resolved.root)}`);
  console.log(`default: ${defaultStore()}`);
  return 0;
}
