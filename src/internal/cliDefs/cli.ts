import { join } from "node:path";

/** Def describe un agent-CLI destino. */
export interface Def {
  name: string; // nombre canónico para --cli
  dir: string; // subdirectorio dentro del proyecto
  desc: string;
  legacyDir?: string; // alternativo (solo codex)
}

// Tabla de agent-CLIs soportados.
const defs: Record<string, Def> = {
  opencode: { name: "opencode", dir: join(".opencode", "skills"), desc: "Opencode CLI" },
  anthropic: { name: "anthropic", dir: join(".claude", "skills"), desc: "Claude Code (Anthropic)" },
  claude: { name: "claude", dir: join(".claude", "skills"), desc: "Alias de anthropic" },
  codex: {
    name: "codex",
    dir: join(".agents", "skills"),
    legacyDir: join(".codex", "skills"),
    desc: "OpenAI Codex (canónico .agents, legacy .codex)",
  },
  agents: { name: "agents", dir: join(".agents", "skills"), desc: "Genérico cross-CLI (.agents)" },
  gemini: { name: "gemini", dir: join(".gemini", "skills"), desc: "Google Gemini CLI" },
  cursor: { name: "cursor", dir: join(".cursor", "skills"), desc: "Cursor" },
  phi: { name: "phi", dir: join(".phi", "skills"), desc: "PHI (configurable)" },
};

/**
 * Normaliza/valida --cli y devuelve la clave canónica.
 * "claude" se conserva como clave válida pero apunta al mismo dir que anthropic.
 */
export function normalize(cli: string): string {
  const key = cli.trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(defs, key)) return key;
  throw new Error(`agent-CLI desconocido ${JSON.stringify(cli)} (usa: ${list().join(", ")})`);
}

/** Nombres soportados, ordenados. */
export function list(): string[] {
  return Object.keys(defs).sort();
}

function baseDir(key: string, legacy: boolean): string {
  const d = defs[key]!;
  if (legacy) {
    if (!d.legacyDir) throw new Error("--legacy solo aplica a codex");
    return d.legacyDir;
  }
  return d.dir;
}

/** <project>/<dir>/<skill>; con legacy usa el dir alternativo (codex). */
export function targetDir(project: string, cli: string, skill: string, legacy: boolean): string {
  const key = normalize(cli);
  return join(project, baseDir(key, legacy), skill);
}

/** <project>/<dir> sin skill (para crear el directorio). */
export function targetBase(project: string, cli: string, legacy: boolean): string {
  const key = normalize(cli);
  return join(project, baseDir(key, legacy));
}
