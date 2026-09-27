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

```bash
git clone https://github.com/wcervini/tabernaculo.git
cd tabernaculo
./install.sh        # bun install + typecheck + compile + install -m755 to ~/.local/bin
```

The script skips `bun install` if you set `SKIP_DEPS=1`. If `~/.local/bin` is not in your `PATH`, install it manually:

```bash
bun build --compile --outfile tabernaculo src/main.ts
install -m755 tabernaculo ~/.local/bin
```

During development, run without compiling: `bun run src/main.ts <command>`.

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