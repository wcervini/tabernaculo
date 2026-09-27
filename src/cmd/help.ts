/**
 * Ayuda detallada por comando. `tabernaculo help <cmd>` y `<cmd> --help`
 * imprimen el texto correspondiente. Devuelve null si el comando no existe.
 */

const HELP: Record<string, string> = {
  import: `import — importa una skill a tu store

Uso:
  tabernaculo import --from <origen> [flags]

Origen (--from):
  <carpeta>           carpeta local con SKILL.md (o con .md: se envuelve)
  <archivo.md>        un único .md (se copia como SKILL.md)
  <owner>/<repo>      repositorio de GitHub (se clona con git)
  <https://...>       URL de repo Git

Flags:
  --cli <agent>       hint de con qué agent-CLI se importó (opcional)
  --path <sub/dir>    subruta dentro del repo donde está la skill
  --ref <rama>        rama/tag para el clon de GitHub
  --name <nombre>     fuerza el nombre final (evita colisiones)

Nombre final: --name > campo name del frontmatter de SKILL.md > nombre de
archivo/carpeta (normalizado: minúsculas, espacios/_→-, solo [a-z0-9-]).

Varias skills: si el origen trae varias subcarpetas con SKILL.md y estás en
una terminal, muestra un menú numerado para elegir por número o nombre.
Sin terminal (pipe/CI) pide usar --path.
`,
  scan: `scan — explora una carpeta local y elige qué importar

Uso:
  tabernaculo scan --dir <carpeta> [--cli <agent>] [--all]

Detecta (no recursivo): subcarpetas con SKILL.md, subcarpetas con .md (se
envuelven) y .md sueltos. Omite ocultos, .git y node_modules.

Selección:
  lista numerada + números por coma/espacio o rango: 1,3 / 1-3 / all
  --all  importa todo sin preguntar

Si una carpeta candidata trae varias skills, en terminal abre el mismo menú
numerado de import; sin terminal mantiene el error (usa --path).

Resumen final: "N ok, M fallos".
`,
  list: `list — lista las skills del store

Uso:
  tabernaculo list [--cli <agent>]

  --cli <agent>   filtra por el hint con el que se importó la skill
`,
  link: `link — enlaza una skill del store a un proyecto (symlink)

Uso:
  tabernaculo link --cli <agent> --project <ruta> [--skill <nombre>] [--force] [--legacy]

Crea el symlink <destino del CLI>/<skill> -> <store>/skills/<skill>.

Flags:
  --cli <agent>     agent-CLI destino (ver "tabernaculo clis")
  --project <ruta>  raíz del proyecto
  --skill <nombre>  skill a enlazar; sin ella abre un selector interactivo
  --force           reemplaza un symlink/fichero existente (nunca un directorio real)
  --legacy          usa la carpeta antigua (p. ej. codex → .codex/skills)

Idempotente: si el enlace ya apunta al mismo sitio, no hace nada.
`,
  unlink: `unlink — quita el symlink de una skill en un proyecto

Uso:
  tabernaculo unlink --cli <agent> --project <ruta> --skill <nombre> [--legacy]

Solo borra si el destino es un symlink (nunca ficheros ni directorios reales).
`,
  remove: `remove — borra una skill del store

Uso:
  tabernaculo remove --skill <nombre>     (alias: rm, delete)
`,
  clis: `clis — lista los agent-CLIs soportados

Uso:
  tabernaculo clis                        (alias: supported-clis)

Muestra cada <--cli> y la carpeta destino que usa en el proyecto.
`,
  config: `config — muestra o edita el store por defecto

Uso:
  tabernaculo config [--set <ruta>]

Sin flags: ruta efectiva, origen (flag/entorno/archivo/default), archivo y
carpeta de skills.
--set: escribe config.json ({ "store": "<ruta>" }); ~ se expande.

Resolución del store:
  --store > $TABERNACULO_HOME > $TABERNACULO_STORE > config.json > default
`,
  completion: `completion — genera el script de autocompletado

Uso:
  tabernaculo completion <bash|zsh|fish> [--install]

  --install   solo para fish (~/.config/fish/completions/); los demás se
              redirigen a mano.

Ejemplos:
  eval "$(tabernaculo completion bash)"          # añadir a ~/.bashrc
  tabernaculo completion zsh > ~/.zfunc/_tabernaculo
  tabernaculo completion fish --install
`,
  help: `help — muestra la ayuda

Uso:
  tabernaculo help [comando]

Sin comando: ayuda general. Con comando: ayuda detallada (igual que
"tabernaculo <comando> --help").
`,
};

/** Texto de ayuda detallada de un comando, o null si no existe. */
export function commandHelp(cmd: string): string | null {
  return HELP[cmd] ?? null;
}
