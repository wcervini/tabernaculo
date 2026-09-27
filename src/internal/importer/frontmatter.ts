import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Lee el campo `name:` del frontmatter YAML de SKILL.md dentro de skillDir.
 * Devuelve "" si no existe o no hay campo name.
 * Según el estándar Agent Skills, la carpeta debe llamarse igual que `name`.
 */
export function frontmatterName(skillDir: string, fileName = "SKILL.md"): string {
  let content: string;
  try {
    content = readFileSync(join(skillDir, fileName), "utf8");
  } catch {
    return "";
  }
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) return "";
  if (lines[0].trim() !== "---") return "";
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "---") break;
    const rest = cutPrefixFold(line, "name:");
    if (rest !== null) {
      let v = rest.trim();
      while (v.startsWith(`"`) || v.startsWith("'")) v = v.slice(1);
      while (v.endsWith(`"`) || v.endsWith("'")) v = v.slice(0, -1);
      v = v.trim();
      // name de una línea: corta en comentarios.
      const hash = v.indexOf("#");
      if (hash >= 0) v = v.slice(0, hash).trim();
      return v;
    }
  }
  return "";
}

function cutPrefixFold(s: string, prefix: string): string | null {
  if (s.length < prefix.length) return null;
  if (s.slice(0, prefix.length).toLowerCase() !== prefix.toLowerCase()) return null;
  return s.slice(prefix.length);
}
