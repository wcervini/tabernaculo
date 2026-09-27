# tabernaculo

[🇬🇧 English](README.md) · 🇪🇸 Español

**tabernaculo** es un gestor de **skills** (estándar Agent Skills: carpeta con `SKILL.md`) para **agent-CLIs**. Importa skills desde **GitHub o rutas locales** a un **store local**, y las **enlaza** a proyectos mediante symlinks en la carpeta que cada agent-CLI espera (`.opencode/skills`, `.claude/skills`, `.agents/skills`, …).

Escrito en **TypeScript sobre Bun**, compilado a un **binario único**. Sin dependencias de runtime: solo necesita `bun` y `git` del sistema.

## Características

- **Un solo store para todos los agent-CLIs** — la skill es genérica; el agent-CLI solo decide la carpeta destino al enlazar.
- **`import` desde GitHub o local** — carpeta con `SKILL.md`, un `.md` suelto (se envuelve como `SKILL.md`), o un repo con varias skills (menú numerado interactivo en terminal).
- **`scan`** — detecta e importa varias skills de una carpeta local a la vez, con selección `1,3`, `1-3` o `all`.
- **`link`/`unlink`** — enlaza skills a un proyecto con symlinks seguros (idempotente, `--force` para reemplazar).
- **`config`** — apunta el store a cualquier carpeta (p. ej. `~/.skills`), o mantén el default `~/.local/tabernaculo`.
- **Autocompletado** — bash, zsh y fish.
- **Nombrado según el estándar** — manda el `name:` del frontmatter de `SKILL.md`; los sufijos con hash se limpian.

## Requisitos

- **Bun** (>= 1.x) — ejecuta TypeScript nativamente y compila el binario.
- **git** — herramienta del sistema usada para clonar repos de GitHub.
- _Opcional:_ [GitHub CLI](https://cli.github.com) (`gh`) o claves SSH para autenticarse en GitHub.

## Instalación

Hay varias formas de conseguir `tabernaculo` — elige la que mejor te venga:

| Método | Comando | Runtime necesario |
|---|---|---|
| **npm** (global) | `npm install -g tabernaculo` | Bun |
| **npx** (sin instalar) | `npx tabernaculo ...` | Bun |
| **Binario compilado** (GitHub Releases) | descarga según plataforma | ninguno (standalone) |
| **Desde el código fuente** | ver más abajo | Bun + git |

> El store y su config (`~/.config/tabernaculo/config.json`) viven en tu carpeta de usuario, así que persisten con cualquier método.

### 1) npm (instalación global)

```bash
npm install -g tabernaculo
```

El comando `tabernaculo` queda en tu `PATH`. Requiere **Bun** en runtime (el entrypoint se ejecuta con Bun). También puedes instalarlo con Bun:

```bash
bun install -g tabernaculo
```

### 2) npx (ejecutar sin instalar)

```bash
npx tabernaculo <comando>        # p. ej. npx tabernaculo list
```

Sin instalación global — cada llamada descarga el paquete. También requiere **Bun**. Añade `-y` para saltar el prompt de instalación.

### 3) Binario compilado (no necesita Bun)

Binarios standalone para cada plataforma en [GitHub Releases](https://github.com/wcervini/tabernaculo/releases). Esta URL apunta siempre a la última versión:

```
https://github.com/wcervini/tabernaculo/releases/latest/download/<asset>
```

| Plataforma | Asset |
|---|---|
| Linux x64 | `tabernaculo-linux-x64` |
| Linux arm64 | `tabernaculo-linux-arm64` |
| macOS Intel | `tabernaculo-darwin-x64` |
| macOS Apple Silicon | `tabernaculo-darwin-arm64` |
| Windows x64 | `tabernaculo-windows-x64.exe` |
| Windows arm64 | `tabernaculo-windows-arm64.exe` |

**Linux (x64 / arm64):**

```bash
curl -fL -o tabernaculo https://github.com/wcervini/tabernaculo/releases/latest/download/tabernaculo-linux-x64
chmod +x tabernaculo
sudo mv tabernaculo /usr/local/bin/
```

**macOS (Intel / Apple Silicon):**

```bash
curl -fL -o tabernaculo https://github.com/wcervini/tabernaculo/releases/latest/download/tabernaculo-darwin-arm64
chmod +x tabernaculo
sudo mv tabernaculo /usr/local/bin/
```

> Gatekeeper de macOS: si macOS bloquea el binario sin firmar, ejecuta `xattr -d com.apple.quarantine ./tabernaculo` (o clic derecho → Abrir).

**Windows (PowerShell):**

```powershell
New-Item -ItemType Directory -Force $HOME\.local\bin | Out-Null
Invoke-WebRequest -Uri https://github.com/wcervini/tabernaculo/releases/latest/download/tabernaculo-windows-x64.exe -OutFile $HOME\.local\bin\tabernaculo.exe
```

Añade `%USERPROFILE%\.local\bin` a tu PATH si hace falta.

**Verifica cualquiera de los métodos:**

```bash
tabernaculo --help
```

> Notas de plataforma: `link` crea symlinks — en Windows activa el **Modo desarrollador** (o usa una shell elevada). Los scripts de autocompletado apuntan a bash/zsh/fish; en Windows úsalos con Git Bash o WSL2.

### 4) Desde el código fuente (Bun + git)

**Linux / macOS**

```bash
git clone https://github.com/wcervini/tabernaculo.git
cd tabernaculo
./install.sh        # bun install + typecheck + compile + install -m755 a ~/.local/bin
```

`SKIP_DEPS=1` omite `bun install`. Si `~/.local/bin` no está en tu `PATH`, instala manualmente:

```bash
bun build --compile --outfile tabernaculo src/main.ts
install -m755 tabernaculo ~/.local/bin
```

**Windows (PowerShell)**

```powershell
git clone https://github.com/wcervini/tabernaculo.git
cd tabernaculo
bun install
bun build --compile --outfile tabernaculo.exe src/main.ts
New-Item -ItemType Directory -Force $HOME\.local\bin | Out-Null
Move-Item .\tabernaculo.exe $HOME\.local\bin\
```

**Cualquier SO — desde el código fuente (sin compilar)**

```bash
bun install
bun run src/main.ts <comando>
```

## Inicio rápido

```bash
# apunta el store a una carpeta de skills existente (una vez)
tabernaculo config --set ~/.skills

# importa una skill desde GitHub
tabernaculo import --from someorg/some-skill-repo

# lista lo que hay en el store
tabernaculo list

# enlaza una skill al proyecto actual para opencode
tabernaculo link --cli opencode --project . --skill drizzle
```

## Ejemplos de uso

### Importar skills

```bash
# desde un repo de GitHub (atajo owner/repo)
tabernaculo import --from wcervini/my-skill

# desde una URL de GitHub, una rama concreta y una subcarpeta
tabernaculo import --from https://github.com/org/skills-repo --ref main --path skills/drizzle

# desde una carpeta local (manda el frontmatter name de SKILL.md)
tabernaculo import --from ~/src/my-skill-folder

# desde un .md suelto (se envuelve como SKILL.md)
tabernaculo import --from ~/notes/awesome-skill.md

# renombrar al importar (p. ej. si el nombre ya existe en el store)
tabernaculo import --from ~/src/my-skill-folder --name my-skill-2
```

Un repo con varias skills abre un **menú numerado** en terminal interactiva (sin TTY mantiene el error sugiriendo `--path`):

```
$ tabernaculo import --from org/multi-skill-repo
Skills encontradas en el origen:
  1) alpha
  2) beta
Elige número o nombre: 2
ok: beta -> ~/.skills/beta
```

### Importar en lote con `scan`

```
$ tabernaculo scan --dir ~/src/skills-collection
Skills detectadas:
  1) drizzle [carpeta]
  2) zod [carpeta]
  3) my-notes [.md]
Elige números (ej. 1,3 o 1-3, 'all' para todas): 1-2
ok: drizzle -> ~/.skills/drizzle
ok: zod -> ~/.skills/zod
resumen: 2 ok, 0 fallos
```

```bash
# sin preguntas: importa todo
tabernaculo scan --dir ~/src/skills-collection --all
```

### Enlazar skills a proyectos

```bash
# selector interactivo si omites --skill
tabernaculo link --cli opencode --project .
# Skills disponibles:
#   1) drizzle
#   2) zod
# Elige número: 1

# la misma skill, enlazada a varios agent-CLIs
tabernaculo link --cli claude --project ~/apps/api --skill drizzle
tabernaculo link --cli codex --legacy --project ~/apps/api --skill drizzle

# reemplaza un enlace existente/incorrecto
tabernaculo link --cli opencode --project . --skill drizzle --force
```

### Gestionar el store

```bash
tabernaculo list                      # todo el store
tabernaculo list --cli codex          # solo skills importadas con ese hint

tabernaculo unlink --cli opencode --project . --skill drizzle
tabernaculo remove --skill old-skill  # (alias: rm)
```

### Apuntar el store a otra carpeta

```bash
tabernaculo config                    # store efectivo, origen y archivo de config
tabernaculo config --set ~/.skills    # persiste la ruta del store en config.json
```

## Comandos

| Comando | Descripción |
|---|---|
| `import` | Importa una skill desde una ruta local o GitHub. `--from` puede ser una carpeta, un `.md` suelto, un `owner/repo` o una URL; `--path <sub/dir>` para un subpath; `--ref <rama>` para una rama concreta; `--name <override>` para renombrar. En terminal, un repo con varias skills muestra un **menú numerado** (elige por número o nombre). |
| `scan` | Detecta skills bajo `--dir` (subcarpetas con `SKILL.md`/`.md`, y `.md` sueltos) y las importa. Selección con `1,3`, `1-3` o `all`; `--all` salta la pregunta. Resume con `N ok, M fallos`. |
| `list` | Lista las skills del store. `--cli <hint>` filtra por el hint guardado al importar. |
| `link` | Enlaza una skill a un proyecto: `--cli <agent>`, `--project <ruta>`, `--skill <nombre>` (si omites `--skill` abre un selector interactivo). Idempotente; `--force` reemplaza links/ficheros (nunca directorios reales); `--legacy` apunta al layout antiguo de Codex. |
| `unlink` | Quita un symlink de un proyecto (solo borra symlinks). |
| `remove` | Borra una skill del store. Alias: `rm`. |
| `clis` | Lista los agent-CLIs soportados. Alias: `supported-clis`. |
| `config` | Muestra el store efectivo, su origen y el archivo de configuración. `--set <ruta>` escribe `config.json` (se expande `~`). |
| `completion` | Imprime un script de autocompletado: `bash`, `zsh` o `fish`. `fish --install` lo escribe en `~/.config/fish/completions/`. |
| `help` | Ayuda general, o `help <comando>` / `<comando> --help` para ayuda detallada. |

Ejecuta `tabernaculo help <comando>` para la lista completa de flags y notas.

## Agent-CLIs soportados (`--cli`)

| `--cli` | Carpeta destino | Notas |
|---|---|---|
| `opencode` | `.opencode/skills` | |
| `anthropic` (alias `claude`) | `.claude/skills` | Claude Code |
| `codex` | `.agents/skills` | Ruta canónica actual; `--legacy` → `.codex/skills` |
| `agents` | `.agents/skills` | Genérico cross-CLI |
| `gemini` | `.gemini/skills` | |
| `cursor` | `.cursor/skills` | |
| `phi` | `.phi/skills` | |

## Store y configuración

La raíz del store se resuelve en este orden:

`--store` (flag) > `$TABERNACULO_HOME` > `$TABERNACULO_STORE` > `~/.config/tabernaculo/config.json` (`store`) > `~/.local/tabernaculo`

- `config.json` guarda `{ "store": "/ruta/al/store" }`; se expande `~`. Se crea automáticamente en el primer uso (nunca sobrescribe uno existente). Se respeta `$XDG_CONFIG_HOME`.
- La configuración acepta **dos layouts**, auto-detectados:
  1. `<store>/skills/<nombre>` — layout por defecto (p. ej. `~/.local/tabernaculo`).
  2. `<store>/<nombre>` directo — cuando el propio store es un repo de skills con carpetas `SKILL.md` en la raíz (p. ej. `~/.skills`).
- Cada skill importada lleva un `.tabernaculo.json` con metadatos (`name`, `cli` hint, `source`, `url_or_path`, `ref`, `subpath`, `imported_at`).
- El layout legacy `skills/<cli>/<nombre>` de versiones anteriores se sigue listando y enlazando (el plano gana en conflicto de nombres).

## Autocompletado

```bash
echo 'eval "$(tabernaculo completion bash)"' >> ~/.bashrc
mkdir -p ~/.zfunc && tabernaculo completion zsh > ~/.zfunc/_tabernaculo   # + añadir ~/.zfunc a fpath y compinit
tabernaculo completion fish --install                                     # → ~/.config/fish/completions/
```

## Desarrollo

```
src/
  main.ts                  entrypoint → dispatch
  cmd/                     capa de comandos (root, flags, pick, scan, config, help, completion)
  internal/
    cliDefs/               mapa agent-CLI → carpeta destino
    store/                 store, meta, list/resolve/remove
    importer/              import local y GitHub, scan, frontmatter de SKILL.md
    linker/                link/unlink con symlinks seguros
    config/                config.json + resolución del store
    fsutil/                helpers de sistema de ficheros
```

```bash
bun install
bun run typecheck     # tsc --noEmit (strict)
bun run build         # bun build --compile → ./tabernaculo
```

> Nota: el binario compilado embebe el runtime de Bun, así que pesa bastante (**~95 MB**) — es el precio de un ejecutable único y sin dependencias (comparable a `go build`, salvando el tamaño).

Este proyecto es un port de una implementación original en Go; los paquetes `cmd/` e `internal/` mapean 1:1. La documentación de diseño detallada vive en [`MEMORIA.md`](MEMORIA.md).