# tabernaculo

🇬🇧 English · [🇪🇸 Español](README.es.md)

**tabernaculo** is a skill manager for agent CLIs. It imports [Agent Skills](https://agentskills.io) (a folder with a `SKILL.md`) from **GitHub or local paths** into a local **store**, and **links** them into projects via symlinks placed in the folder each agent CLI expects (`.opencode/skills`, `.claude/skills`, `.agents/skills`, …).

Written in **TypeScript, running on Bun**, compiled to a single standalone binary. No runtime dependencies: only `bun` and system `git` are required.

## Features

- **Single store for all agent CLIs** — skills are generic; the agent CLI only decides the destination folder when linking.
- **`import` from GitHub or local** — folder with `SKILL.md`, a loose `.md` (wrapped as `SKILL.md`), or a repo with several skills (interactive numbered menu in a terminal).
- **`scan`** — detect and import multiple skills from a local folder at once, with `1,3`, `1-3` or `all` selection.
- **`link`/`unlink`** — symlink skills into a project using safe links (idempotent, `--force` to replace).
- **`config`** — point the store at any folder (e.g. `~/.skills`), or keep the default `~/.local/tabernaculo`.
- **Shell completion** — bash, zsh and fish.
- **Naming follows the standard** — the frontmatter `name:` of `SKILL.md` wins; hash suffixes are cleaned up.

## Requirements

- **Bun** (>= 1.x) — used to run TypeScript natively and to compile the binary.
- **git** — system tool used to clone GitHub repos.
- _Optional:_ [GitHub CLI](https://cli.github.com) (`gh`) or SSH keys for GitHub authentication.

## Install

There are several ways to get `tabernaculo` — pick whichever fits:

| Method | Command | Runtime needed |
|---|---|---|
| **npm** (global) | `npm install -g tabernaculo` | Bun |
| **npx** (no install) | `npx tabernaculo ...` | Bun |
| **Compiled binary** (GitHub Releases) | download per platform | none (standalone) |
| **From source** | see below | Bun + git |

> The store and its config (`~/.config/tabernaculo/config.json`) live in your home directory, so they persist across any method.

### 1) npm (global install)

```bash
npm install -g tabernaculo
```

The `tabernaculo` command is then on your `PATH`. Requires **Bun** at runtime (the entrypoint runs on Bun). You can also install it with Bun itself:

```bash
bun install -g tabernaculo
```

### 2) npx (run without installing)

```bash
npx tabernaculo <command>        # e.g. npx tabernaculo list
```

No global install — each call fetches the package. Also requires **Bun**. Add `-y` to skip the install prompt.

### 3) Compiled binary (no Bun needed)

Standalone binaries for every platform are attached to [GitHub Releases](https://github.com/wcervini/tabernaculo/releases). This URL always points to the latest version:

```
https://github.com/wcervini/tabernaculo/releases/latest/download/<asset>
```

| Platform | Asset |
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

> macOS Gatekeeper: if macOS blocks the unsigned binary, run `xattr -d com.apple.quarantine ./tabernaculo` (or right-click → Open).

**Windows (PowerShell):**

```powershell
New-Item -ItemType Directory -Force $HOME\.local\bin | Out-Null
Invoke-WebRequest -Uri https://github.com/wcervini/tabernaculo/releases/latest/download/tabernaculo-windows-x64.exe -OutFile $HOME\.local\bin\tabernaculo.exe
```

Add `%USERPROFILE%\.local\bin` to your PATH if needed.

**Verify any of the methods above:**

```bash
tabernaculo --help
```

> Platform notes: `link` creates symlinks — on Windows enable **Developer Mode** (or use an elevated shell). The completion scripts target bash/zsh/fish; on Windows use Git Bash or WSL2 for them.

### 4) From source (Bun + git)

**Linux / macOS**

```bash
git clone https://github.com/wcervini/tabernaculo.git
cd tabernaculo
./install.sh        # bun install + typecheck + compile + install -m755 to ~/.local/bin
```

`SKIP_DEPS=1` skips `bun install`. If `~/.local/bin` is not in your `PATH`, install manually:

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

**Any OS — run from the source (no compilation)**

```bash
bun install
bun run src/main.ts <command>
```

## Quick start

```bash
# point the store at an existing skills folder (once)
tabernaculo config --set ~/.skills

# import a skill from GitHub
tabernaculo import --from someorg/some-skill-repo

# list what's in the store
tabernaculo list

# link a skill into the current project for opencode
tabernaculo link --cli opencode --project . --skill drizzle
```

## Usage examples

> The CLI's own output (prompts and menus) is in Spanish.

### Import skills

```bash
# from a GitHub repo (owner/repo shorthand)
tabernaculo import --from wcervini/my-skill

# from a GitHub URL, a specific branch and a subfolder
tabernaculo import --from https://github.com/org/skills-repo --ref main --path skills/drizzle

# from a local folder (the frontmatter name of SKILL.md wins)
tabernaculo import --from ~/src/my-skill-folder

# from a loose markdown file (wrapped as SKILL.md)
tabernaculo import --from ~/notes/awesome-skill.md

# rename on import (e.g. when the name already exists in the store)
tabernaculo import --from ~/src/my-skill-folder --name my-skill-2
```

A repo with several skills opens a numbered menu in a terminal (without a TTY it keeps the error suggesting `--path`):

```
$ tabernaculo import --from org/multi-skill-repo
Skills encontradas en el origen:
  1) alpha
  2) beta
Elige número o nombre: 2
ok: beta -> ~/.skills/beta
```

### Import in bulk with `scan`

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
# skip the prompt and import everything
tabernaculo scan --dir ~/src/skills-collection --all
```

### Link skills into projects

```bash
# interactive picker when --skill is omitted
tabernaculo link --cli opencode --project .
# Skills disponibles:
#   1) drizzle
#   2) zod
# Elige número: 1

# link the same skill into several agent CLIs
tabernaculo link --cli claude --project ~/apps/api --skill drizzle
tabernaculo link --cli codex --legacy --project ~/apps/api --skill drizzle

# replace an existing/wrong link
tabernaculo link --cli opencode --project . --skill drizzle --force
```

### Manage the store

```bash
tabernaculo list                      # everything in the store
tabernaculo list --cli codex          # only skills imported with that hint

tabernaculo unlink --cli opencode --project . --skill drizzle
tabernaculo remove --skill old-skill  # (alias: rm)
```

### Point the store somewhere else

```bash
tabernaculo config                    # show effective store, origin and config file
tabernaculo config --set ~/.skills    # persist the store path in config.json
```

## Commands

| Command | Description |
|---|---|
| `import` | Import a skill from a local path or GitHub. `--from` can be a folder, a loose `.md`, an `owner/repo` or a URL; `--path <sub/dir>` for a subpath; `--ref <branch>` for a specific branch; `--name <override>` to rename. In a terminal, a repo with several skills shows a numbered menu (pick by number or name). |
| `scan` | Detect skills under `--dir` (subfolders with `SKILL.md`/`.md`, loose `.md` files) and import them. Select with `1,3`, `1-3` or `all`; `--all` skips the prompt. Prints a `N ok, M fail` summary. |
| `list` | List the skills in the store. `--cli <hint>` filters by the hint stored at import time. |
| `link` | Symlink a skill into a project: `--cli <agent>`, `--project <path>`, `--skill <name>` (omitting `--skill` opens an interactive picker). Idempotent; `--force` replaces links/files (never real directories); `--legacy` targets the old Codex layout. |
| `unlink` | Remove a symlink from a project (only removes symlinks). |
| `remove` | Delete a skill from the store. Alias: `rm`. |
| `clis` | List the supported agent CLIs. Alias: `supported-clis`. |
| `config` | Show the effective store, its origin and the config file. `--set <path>` writes `config.json` (`~` is expanded). |
| `completion` | Print a completion script: `bash`, `zsh` or `fish`. `fish --install` writes it into `~/.config/fish/completions/`. |
| `help` | General help, or `help <command>` / `<command> --help` for per-command details. |

Run `tabernaculo help <command>` for the full flag list and notes.

## Supported agent CLIs (`--cli`)

| `--cli` | Destination folder | Notes |
|---|---|---|
| `opencode` | `.opencode/skills` | |
| `anthropic` (alias `claude`) | `.claude/skills` | Claude Code |
| `codex` | `.agents/skills` | Current canonical path; `--legacy` → `.codex/skills` |
| `agents` | `.agents/skills` | Generic cross-CLI |
| `gemini` | `.gemini/skills` | |
| `cursor` | `.cursor/skills` | |
| `phi` | `.phi/skills` | |

## Store and configuration

The store root is resolved in this order:

`--store` flag > `$TABERNACULO_HOME` > `$TABERNACULO_STORE` > `~/.config/tabernaculo/config.json` (`store`) > `~/.local/tabernaculo`

- `config.json` stores `{ "store": "/path/to/store" }`; `~` is expanded. It is created automatically on first run (never overwrites an existing file). `$XDG_CONFIG_HOME` is respected.
- The configuration accepts two layouts, auto-detected:
  1. `<store>/skills/<name>` — default layout (e.g. `~/.local/tabernaculo`).
  2. `<store>/<name>` directly — when the store itself is a skills repo with `SKILL.md` folders in its root (e.g. `~/.skills`).
- Each imported skill carries a `.tabernaculo.json` metadata file (`name`, `cli` hint, `source`, `url_or_path`, `ref`, `subpath`, `imported_at`).
- The legacy layout `skills/<cli>/<name>` from previous versions is still listed and linked (flat layout wins on name conflicts).

## Shell completion

```bash
echo 'eval "$(tabernaculo completion bash)"' >> ~/.bashrc
mkdir -p ~/.zfunc && tabernaculo completion zsh > ~/.zfunc/_tabernaculo   # then add ~/.zfunc to fpath + compinit
tabernaculo completion fish --install                                     # → ~/.config/fish/completions/
```

## Development

```
src/
  main.ts                  entrypoint → dispatch
  cmd/                     command layer (root, flags, pick, scan, config, help, completion)
  internal/
    cliDefs/               agent-CLI → destination folder map
    store/                 store, meta, list/resolve/remove
    importer/              local & GitHub import, scan, SKILL.md frontmatter
    linker/                safe symlink link/unlink
    config/                config.json + store resolution
    fsutil/                filesystem helpers
```

```bash
bun install
bun run typecheck     # tsc --noEmit (strict)
bun run build         # bun build --compile → ./tabernaculo
```

> Note: the compiled binary embeds the Bun runtime, so it is large (**~95 MB**) — the trade-off for a standalone, dependency-free executable (comparable to `go build` output size expectations aside).

This project was ported from an original Go implementation; equivalent `cmd/` and `internal/` packages map 1:1. The detailed (Spanish) design documentation lives in [`MEMORIA.md`](MEMORIA.md).