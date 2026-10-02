import { flagUsage, parseCmd } from "./flags.ts";
import { canPrompt, pickSkillsFromNames, selectMany, SelectionCancelled } from "./pick.ts";
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
    if (!canPrompt()) {
      process.stderr.write("error: sin terminal no hay menú; usa --all para importar todo\n");
      return 1;
    }
    try {
      sel = await selectMany(
        "Elige las skills a importar (espacio marca, enter confirma)",
        cands.map((c) => ({
          name: `${c.name} [${c.isDir ? "carpeta" : ".md"}]`,
          value: c,
          description: c.path,
        })),
        { cancel: true },
      );
    } catch (e) {
      if (e instanceof SelectionCancelled) {
        console.log("(cancelado: no se importó nada)");
        return 0;
      }
      process.stderr.write(`error: ${(e as Error).message}\n`);
      return 1;
    }
  }

  let ok = 0;
  let fail = 0;
  // Si una carpeta contiene varias skills, ofrece el mismo checkbox que `import`
  // (solo en terminal interactiva; sin TTY se mantiene el error).
  const select = canPrompt() ? pickSkillsFromNames : undefined;
  for (const c of sel) {
    try {
      const got = await importSkill(root, { from: c.path, cli, select });
      for (const g of got) console.log(`ok: ${g.name}`);
      ok += got.length;
    } catch (e) {
      if (e instanceof SelectionCancelled) {
        console.log(`– ${c.name}: omitida`);
        continue;
      }
      console.log(`x ${c.name}: ${(e as Error).message}`);
      fail++;
    }
  }
  console.log(`resumen: ${ok} ok, ${fail} fallos`);
  return fail > 0 ? 1 : 0;
}
