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
  -D, --delete-source borra la carpeta de origen tras importar (solo local)

Nombre final: --name > campo name del frontmatter de SKILL.md > nombre de
archivo/carpeta (normalizado: minúsculas, espacios/_→-, solo [a-z0-9-]).

-D (importar y borrar el origen):
  Solo con una carpeta local que tenga la estructura convencional:
      <mi-skill>/SKILL.md            (obligatorio, en la raíz)
      <mi-skill>/scripts/            (opcional)
      <mi-skill>/references/         (opcional)
      <mi-skill>/assets/             (opcional)
      <mi-skill>/...cualquier otro fichero o carpeta
  Además, el nombre de la carpeta debe coincidir con el campo name del
  frontmatter de SKILL.md. Si algo no cuadra, NO se importa ni se borra
  nada (error y código 1). No se puede combinar con --path ni con --name.
  Tras importar bien, en una terminal pide confirmación (s = sí) y luego
  borra la carpeta origen; sin terminal borra directamente.
  Útil tras descargar skills de un repo o con "npx skills add <ruta>".

Varias skills: si el origen trae varias subcarpetas con SKILL.md y estás en
una terminal, muestra un menú checkbox para marcar una o VARIAS skills
(espacio marca, enter confirma; Ctrl-C cancela sin importar nada). Las
marcadas se importan de forma atómica: si una falla, no queda ninguna.
Sin terminal (pipe/CI) pide usar --path.
`,
  scan: `scan — explora una carpeta local y elige qué importar

Uso:
  tabernaculo scan --dir <carpeta> [--cli <agent>] [--all]

Detecta (no recursivo): subcarpetas con SKILL.md, subcarpetas con .md (se
envuelven) y .md sueltos. Omite ocultos, .git y node_modules.

Selección:
  menú checkbox: espacio marca, enter confirma (Ctrl-C cancela sin importar)
  --all  importa todo sin preguntar (obligatorio sin terminal)

Si una carpeta candidata trae varias skills, en terminal abre el mismo
checkbox de import; sin terminal mantiene el error (usa --path).

Resumen final: "N ok, M fallos".
`,
  list: `list — lista las skills instaladas (por defecto, el directorio actual)

Uso:
  tabernaculo list [--cli <agent>] [--project <ruta>] [--legacy]
  tabernaculo list --available [--cli <hint>]      (skills del store)

Instaladas (por defecto): skills enlazadas (symlinks) en el proyecto.
  --project <ruta>  proyecto a inspeccionar; si se omite, el directorio actual
  --cli <agent>     solo ese agent-CLI; sin él agrupa por carpeta destino
  --legacy          usa la carpeta antigua de codex (.codex/skills)
  Los enlaces rotos se marcan como "(enlace roto)".

Store (disponibles para enlazar):
  --available       lista las skills del store
  --cli <hint>      filtra por el hint con el que se importó la skill
`,
  link: `link — enlaza skill(s) del store a un proyecto (symlink)

Uso:
  tabernaculo link --cli <agent> [--project <ruta>] [--skill <nombre>] [--force] [--legacy]

Crea el symlink <destino del CLI>/<skill> -> <store>/skills/<skill> y lo
registra en <destino del CLI>/.tabernaculo.json (manifiesto de lo enlazado:
referencia, no fuente de verdad — los symlinks mandan).

  --project <ruta>  raíz del proyecto; si se omite, usa el directorio actual

Flags:
  --cli <agent>     agent-CLI destino (ver "tabernaculo clis")
  --project <ruta>  raíz del proyecto
  --skill <nombre>  skill a enlazar; sin ella abre un checkbox para marcar
                    una o VARIAS skills del store (espacio marca, enter
                    confirma; incluye opción "Cancelar"). Solo aparecen las
                    que aún NO están enlazadas en este proyecto; si ya lo
                    están todas, avisa. Sin terminal y sin --skill es error.
  --force           reemplaza un symlink/fichero existente (nunca un directorio real)
  --legacy          usa la carpeta antigua (p. ej. codex → .codex/skills)

Idempotente: si el enlace ya apunta al mismo sitio, no hace nada.
`,
  unlink: `unlink — quita el symlink de skill(s) en un proyecto

Uso:
  tabernaculo unlink --cli <agent> [--project <ruta>] [--skill <nombre>] [--legacy]

Sin --project usa el directorio actual (CWD).
Sin --skill abre un checkbox con las skills INSTALADAS en el proyecto para
ese agent-CLI (leyendo los symlinks de <destino del CLI>); marca una o varias
y confirma. Incluye opción "Cancelar". Sin terminal y sin --skill es error.

Con --skill <nombre> quita solo esa (debe ser un symlink).
Nunca borra ficheros ni directorios reales. Al quitar, actualiza el
manifiesto .tabernaculo.json.
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
  version: `version — muestra la versión de tabernaculo

Uso:
  tabernaculo version                 (alias: tabernaculo -v, tabernaculo --version)

Imprime "tabernaculo <version>" y sale con código 0. No toca el store.
La versión viene de package.json; en el binario compilado va incrustada.
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
