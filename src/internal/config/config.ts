import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve as pathResolve } from "node:path";

/** Contenido del archivo de configuración. */
export interface Config {
  /** Ruta del store (raíz; las skills viven en <store>/skills). */
  store?: string;
}

export type StoreOrigin = "flag" | "entorno" | "archivo" | "default";

export interface ResolvedStore {
  root: string;
  origin: StoreOrigin;
}

function homeDir(): string {
  try {
    return homedir();
  } catch {
    return ".";
  }
}

/** Ruta del archivo de configuración (~/.config/tabernaculo/config.json). */
export function configPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.trim() ? xdg : join(homeDir(), ".config");
  return join(base, "tabernaculo", "config.json");
}

/** Ruta por defecto del store: ~/.local/tabernaculo. */
export function defaultStore(): string {
  return join(homeDir(), ".local", "tabernaculo");
}

/** Expande un `~` inicial a la home del usuario. */
export function expandHome(p: string): string {
  if (p === "~") return homeDir();
  if (p.startsWith("~/")) return join(homeDir(), p.slice(2));
  return p;
}

let loadedConfig = false;
let cachedConfig: Config = {};

/**
 * Lee la config (con caché por proceso). Si no existe devuelve {}. Si existe
 * pero no es JSON válido avisa por stderr y devuelve {}.
 */
export function readConfig(): Config {
  if (loadedConfig) return cachedConfig;
  loadedConfig = true;
  let raw: string;
  try {
    raw = readFileSync(configPath(), "utf8");
  } catch {
    cachedConfig = {};
    return cachedConfig;
  }
  try {
    const parsed = JSON.parse(raw) as Config;
    cachedConfig = parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    process.stderr.write(`aviso: ${configPath()} no es JSON válido (${(e as Error).message})\n`);
    cachedConfig = {};
  }
  return cachedConfig;
}

/** Escribe la config, creando los directorios necesarios. */
export function writeConfig(c: Config): void {
  const p = configPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(c, null, 2) + "\n", "utf8");
  cachedConfig = c;
  loadedConfig = true;
}

/**
 * Crea config.json con el store por defecto si no existe. Se llama al arrancar
 * cualquier comando para que siempre haya archivo. Si no se puede escribir, se
 * ignora (los comandos siguen usando el default).
 */
export function ensureConfig(): void {
  if (existsSync(configPath())) return;
  try {
    writeConfig({ store: defaultStore() });
  } catch {
    // sin permisos: se ignora
  }
}

/**
 * Resuelve el store:
 *   --store > $TABERNACULO_HOME > $TABERNACULO_STORE > config.json > default.
 */
export function resolveStore(explicit: string): ResolvedStore {
  if (explicit) return { root: explicit, origin: "flag" };
  const envHome = process.env.TABERNACULO_HOME;
  if (envHome) return { root: envHome, origin: "entorno" };
  const envStore = process.env.TABERNACULO_STORE;
  if (envStore) return { root: envStore, origin: "entorno" };

  const cfg = readConfig();
  if (cfg.store && cfg.store.trim()) {
    return { root: pathResolve(expandHome(cfg.store.trim())), origin: "archivo" };
  }
  return { root: defaultStore(), origin: "default" };
}

/** Etiqueta legible del origen del store. */
export function originLabel(origin: StoreOrigin): string {
  switch (origin) {
    case "flag":
      return "flag --store";
    case "entorno":
      return "entorno (TABERNACULO_HOME / TABERNACULO_STORE)";
    case "archivo":
      return "archivo de config";
    case "default":
      return "default";
  }
}
