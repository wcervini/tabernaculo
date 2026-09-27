import { chmodSync, copyFileSync, mkdirSync, readdirSync, realpathSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

/** true si la ruta existe (sin importar el tipo). */
export function pathExists(p: string): boolean {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

/** true si la ruta existe y es un directorio. */
export function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** Copia un fichero creando su carpeta destino y preservando el modo. */
export function copyFile(src: string, dst: string): void {
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  try {
    chmodSync(dst, statSync(src).mode);
  } catch {
    // El modo es best-effort (igual que en Go).
  }
}

/** Copia recursiva de un directorio, omitiendo .git y resolviendo symlinks. */
export function copyDir(src: string, dst: string): void {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const from = join(src, entry.name);
    const to = join(dst, entry.name);
    if (entry.isSymbolicLink()) {
      let resolved: string;
      try {
        resolved = realpathSync(from);
      } catch {
        continue;
      }
      if (isDir(resolved)) copyDir(resolved, to);
      else copyFile(resolved, to);
      continue;
    }
    if (entry.isDirectory()) {
      copyDir(from, to);
      continue;
    }
    copyFile(from, to);
  }
}

/** Borra recursivamente ignorando errores (para limpieza de temporales). */
export function removeAll(p: string): void {
  try {
    rmSync(p, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

/** Formatea una fecha en RFC3339 con offset local (como time.RFC3339 de Go). */
export function rfc3339(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}
