import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { list } from "../internal/store/store.ts";

/**
 * Muestra las skills del store y lee la selección por stdin.
 * cli solo filtra si se pasa (hint); "" lista todo.
 */
export async function pickFromList(root: string, cli: string): Promise<string> {
  const entries = list(root, cli);
  if (entries.length === 0) {
    if (!cli) throw new Error("no hay skills en el store (usa import primero)");
    throw new Error(`no hay skills para ${JSON.stringify(cli)} en el store (usa import primero)`);
  }
  console.log("Skills disponibles:");
  entries.forEach((e, i) => console.log(`  ${i + 1}) ${e.name}`));

  const rl = createInterface({ input, output });
  let line: string;
  try {
    line = await rl.question("Elige número: ");
  } catch {
    throw new Error("no se pudo leer selección");
  } finally {
    rl.close();
  }

  const n = Number.parseInt(line.trim(), 10);
  if (!Number.isInteger(n) || n < 1 || n > entries.length) throw new Error("selección inválida");
  return entries[n - 1]!.name;
}

/**
 * Menú numerado para elegir UNA skill de una lista de nombres.
 * Acepta el número (1..n) o el nombre exacto (sin distinguir mayúsculas).
 */
export async function pickSkillFromNames(names: string[]): Promise<string> {
  console.log("Skills encontradas en el origen:");
  names.forEach((n, i) => console.log(`  ${i + 1}) ${n}`));

  const rl = createInterface({ input, output });
  let line: string;
  try {
    line = await rl.question("Elige número o nombre: ");
  } catch {
    throw new Error("no se pudo leer selección");
  } finally {
    rl.close();
  }

  const t = line.trim();
  const n = Number.parseInt(t, 10);
  if (Number.isInteger(n) && n >= 1 && n <= names.length) return names[n - 1]!;
  const found = names.find((x) => x.toLowerCase() === t.toLowerCase());
  if (found) return found;
  throw new Error("selección inválida");
}
