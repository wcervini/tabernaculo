import { checkbox, confirm } from "@inquirer/prompts";
import { list } from "../internal/store/store.ts";

/**
 * Lanzado cuando el usuario cancela una selección interactiva
 * (Ctrl-C, Esc o sin marcar nada). Quien llama decide: import aborta,
 * scan omite esa candidata.
 */
export class SelectionCancelled extends Error {
  constructor() {
    super("selección cancelada");
  }
}

/** Una opción de menú: etiqueta visible + valor devuelto. */
export interface Option<T> {
  name: string;
  value: T;
  description?: string;
}

/** true si hay terminal interactiva para los prompts a pantalla completa. */
export function canPrompt(): boolean {
  return Boolean(process.stdin.isTTY);
}

/** true si el error viene de cancelar el prompt (Ctrl-C/Esc/q). */
function isPromptCancelled(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  return name === "ExitPromptError" || name === "AbortPromptError" || name === "CancelPromptError";
}

/**
 * Pide elegir VARIAS opciones (checkbox): espacio marca, enter confirma.
 * Con `cancel` añade una opción "Cancelar". Sin marcar nada, elegir Cancelar
 * o pulsar Ctrl-C lanza SelectionCancelled.
 */
export async function selectMany<T>(
  message: string,
  options: Option<T>[],
  opts: { pageSize?: number; cancel?: boolean } = {},
): Promise<T[]> {
  const cancelValue = Symbol("cancel");
  const choices: Option<T | symbol>[] = opts.cancel
    ? [...options, { name: "✖ Cancelar", value: cancelValue }]
    : options;
  try {
    const picked = await checkbox<T | symbol>({
      message,
      choices,
      required: true,
      pageSize: opts.pageSize ?? 15,
      loop: false,
    });
    if (picked.length === 0 || picked.some((v) => typeof v === "symbol")) throw new SelectionCancelled();
    return picked as T[];
  } catch (error) {
    if (error instanceof SelectionCancelled) throw error;
    if (isPromptCancelled(error)) throw new SelectionCancelled();
    throw error;
  }
}

/**
 * Muestra las skills del store que **aún no** están enlazadas en el proyecto
 * y deja elegir una o VARIAS (para `link`). cli solo filtra si se pasa (hint);
 * "" lista todo. Si todas las del store ya están enlazadas, lanza error.
 */
export async function pickSkillsFromList(
  root: string,
  cli: string,
  linked: ReadonlySet<string> = new Set(),
): Promise<string[]> {
  const entries = list(root, cli).filter((e) => !linked.has(e.name));
  if (entries.length === 0) {
    if (linked.size > 0) throw new Error("todas las skills del store ya están enlazadas en este proyecto");
    if (!cli) throw new Error("no hay skills en el store (usa import primero)");
    throw new Error(`no hay skills para ${JSON.stringify(cli)} en el store (usa import primero)`);
  }
  return selectMany(
    "Elige las skills a enlazar (espacio marca, enter confirma)",
    entries.map((e) => ({ name: e.name, value: e.name, description: `cli: ${e.cli}` })),
    { cancel: true },
  );
}

/**
 * Menú checkbox para elegir una o VARIAS skills de una lista de nombres
 * (origen con varias subcarpetas). Con una sola no pregunta.
 */
export async function pickSkillsFromNames(names: string[]): Promise<string[]> {
  if (names.length === 1) return [names[0]!];
  return selectMany(
    "Elige las skills a importar (espacio marca, enter confirma)",
    names.map((n) => ({ name: n, value: n })),
    { cancel: true },
  );
}

/**
 * Confirmación del borrado de la carpeta origen tras importar (-D).
 * En terminal pregunta (por defecto no); sin TTY no hay quien conteste,
 * así que devuelve true (el flujo normal de scripts/CI).
 */
export async function confirmDeleteDir(dir: string): Promise<boolean> {
  if (!canPrompt()) return true;
  try {
    return await confirm({ message: `¿Borrar la carpeta origen ${dir}?`, default: false });
  } catch (error) {
    // Si no se puede leer o el usuario cancela, se conserva el origen.
    if (isPromptCancelled(error)) return false;
    process.stderr.write("no se pudo leer la confirmación: se conserva el origen\n");
    return false;
  }
}
