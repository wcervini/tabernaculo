/**
 * Versión de la app, leída de package.json (fuente única de verdad).
 * - Binario compilado: `bun build --compile` la incrusta, así que cada release
 *   lleva la suya sin leer ficheros en runtime.
 * - Instalado por npm: el bin es src/main.ts, y package.json está siempre
 *   en el tarball, así que la import funciona igual.
 */
import pkg from "../package.json" with { type: "json" };

export const VERSION: string = pkg.version;
