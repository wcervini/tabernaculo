import { parseArgs } from "node:util";

/** Error de parseo de flags; el comando responde con código 2. */
export class FlagError extends Error {}

export interface FlagSpec {
  string?: string[];
  boolean?: string[];
}

/**
 * Parser de flags estilo Go `flag` sobre util.parseArgs:
 * acepta `--flag valor` y `--flag=valor`, booleanos sin valor, y es
 * tolerante con posicionales (se ignoran). Devuelve siempre todos los
 * flags con su valor por defecto ("" o false).
 */
export function parseCmd(args: string[], spec: FlagSpec): Record<string, string | boolean> {
  const options: Record<string, { type: "string" | "boolean" }> = {};
  const defaults: Record<string, string | boolean> = {};
  for (const s of spec.string ?? []) {
    options[s] = { type: "string" };
    defaults[s] = "";
  }
  for (const b of spec.boolean ?? []) {
    options[b] = { type: "boolean" };
    defaults[b] = false;
  }
  try {
    const parsed = parseArgs({ args, options, allowPositionals: true, strict: true });
    return { ...defaults, ...(parsed.values as Record<string, string | boolean>) };
  } catch (e) {
    throw new FlagError((e as Error).message);
  }
}

/** Escribe un error de flags a stderr y devuelve el código 2. */
export function flagUsage(err: unknown): number {
  if (err instanceof FlagError) {
    process.stderr.write(err.message + "\n");
    return 2;
  }
  throw err;
}
