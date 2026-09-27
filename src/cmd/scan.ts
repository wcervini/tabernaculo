import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { flagUsage, parseCmd } from "./flags.ts";
import { pickSkillFromNames } from "./pick.ts";
import { importSkill } from "../internal/importer/importer.ts";
import type { Candidate } from "../internal/importer/scan.ts";
import { scanDir } from "../internal/importer/scan.ts";

export async function runScan(root: string, args: string[]): Promise<number> {
  let flags: Record<string, string | boolean>;
  try {
    flags = parseCmd(args, { string: ["dir", "cli"], boolean: ["all"] });
  } catch (e) {
    return flagUsage(e);
  }
  const dir = flags.dir as string;
  const cli = flags.cli as string;
  const all = flags.all as boolean;

  if (!dir) {
    process.stderr.write("scan requiere --dir\n");
    return 2;
  }

  let cands: Candidate[];
  try {
    cands = scanDir(dir);
  } catch (e) {
    process.stderr.write(`error: ${(e as Error).message}\n`);
    return 1;
  }
  if (cands.length === 0) {
    console.log("(sin skills detectadas: se buscan carpetas con SKILL.md y ficheros .md)");
    return 0;
  }

  let sel: Candidate[];
  if (all) {
    sel = cands;
  } else {
    console.log("Skills detectadas:");
    cands.forEach((c, i) => {
      const kind = c.isDir ? "carpeta" : ".md";
      console.log(`  ${i + 1}) ${c.name} [${kind}]`);
    });

    const rl = createInterface({ input, output });
    let line: string;
    try {
      line = await rl.question("Elige números (ej. 1,3 o 1-3, 'all' para todas): ");
    } catch (e) {
      process.stderr.write(`error: no se pudo leer selección: ${(e as Error).message}\n`);
      return 1;
    } finally {
      rl.close();
    }

    let idx: number[];
    try {
      idx = parseMultiSelect(line.trim(), cands.length);
    } catch (e) {
      process.stderr.write(`error: ${(e as Error).message}\n`);
      return 1;
    }
    sel = idx.map((i) => cands[i]!);
  }

  let ok = 0;
  let fail = 0;
  // Si una carpeta contiene varias skills, ofrece el mismo menú que `import`
  // (solo en terminal interactiva; sin TTY se mantiene el error).
  const select = process.stdin.isTTY ? pickSkillFromNames : undefined;
  for (const c of sel) {
    try {
      const got = await importSkill(root, cli, c.path, "", "", "", select);
      console.log(`ok: ${got}`);
      ok++;
    } catch (e) {
      console.log(`x ${c.name}: ${(e as Error).message}`);
      fail++;
    }
  }
  console.log(`resumen: ${ok} ok, ${fail} fallos`);
  return fail > 0 ? 1 : 0;
}

/** Acepta "all", "1,3", "1 2", "1-3" y combinaciones. */
export function parseMultiSelect(input: string, n: number): number[] {
  input = input.toLowerCase().trim();
  if (input === "") throw new Error("selección vacía");
  if (input === "all" || input === "a" || input === "*") {
    return Array.from({ length: n }, (_, i) => i);
  }

  const set = new Set<number>();
  const add = (v: number): void => {
    if (v < 1 || v > n) throw new Error(`número fuera de rango: ${v} (1-${n})`);
    set.add(v - 1);
  };

  for (const tok of input.replace(/,/g, " ").split(/\s+/).filter(Boolean)) {
    if (tok.includes("-")) {
      const parts = tok.split("-", 2);
      const a = Number.parseInt(parts[0]!.trim(), 10);
      const b = Number.parseInt(parts[1]!.trim(), 10);
      if (Number.isNaN(a) || Number.isNaN(b) || a < 1 || b < 1 || a > n || b > n || b < a) {
        throw new Error(`rango inválido: ${JSON.stringify(tok)}`);
      }
      for (let v = a; v <= b; v++) add(v);
      continue;
    }
    const v = Number.parseInt(tok.trim(), 10);
    if (Number.isNaN(v)) throw new Error(`selección inválida: ${JSON.stringify(tok)}`);
    add(v);
  }
  if (set.size === 0) throw new Error("selección vacía");
  return [...set].sort((a, b) => a - b);
}
