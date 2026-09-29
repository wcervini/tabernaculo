# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `tabernaculo version` (also `-v` / `--version`) prints `tabernaculo <version>`
  and exits 0. It answers before touching the store or the config, like `help`.
  The version is read from `package.json` (the single source of truth, never
  hardcoded in the code) and `bun build --compile` inlines it, so every release
  binary reports its own version without reading files at runtime. Installed
  from npm the bin is `src/main.ts` and `package.json` always ships in the
  tarball, so it works the same way.
- Shell completion (bash/zsh/fish) knows the `version` command and the global
  `--version` / `-v` flag.
- Documented in the help output (`tabernaculo help version` plus the general
  help) and in the command table of both READMEs.

## [0.3.0] - 2026-09-29

### Added
- `import -D` (`--delete-source`): imports a skill from a **local folder**
  and then deletes that folder. It only accepts the conventional Agent Skills
  layout — `SKILL.md` at the root of the folder, extra files/subfolders
  allowed — and the folder name must match the `name` field of the
  `SKILL.md` frontmatter. If any of that fails, nothing is imported and
  nothing is deleted (error, exit 1). Rejected with a clear error: a loose
  `.md`, a GitHub source, `--path` and `--name` combinations, and critical
  paths (`/`, `$HOME`, cwd). After a successful import, a terminal asks for
  confirmation (`s` = yes, default no) before deleting; without a TTY it
  deletes right away. Useful after downloading a skill or running
  `npx skills add <path>`.
- Shell completion (bash/zsh/fish) knows the new flag.

### Changed
- `importSkill` (internal API) now takes an `ImportOptions` object instead of
  seven positional arguments, and returns `ImportResult`
  (`name`, `removed`, `kept`) so the caller can report whether the source
  folder was deleted. Internal API only; the CLI behaviour is unchanged.
- `import --help` documents `-D`; both READMEs gained an
  "import and delete the source folder" section.

## [0.2.0] - 2026-09-28

### Added
- Cancel option in interactive menus: typing `c`, `cancelar` or `q`
  aborts the `scan` multiselect and the numbered multi-skill menu of
  `import` (new `SelectionCancelled` error in `src/cmd/pick.ts`).
  `import` exits cleanly without importing anything; `scan` skips that
  candidate (`– <name>: omitida`) and continues with the rest.

### Changed
- `scan` and `import` prompts now advertise the cancel key
  (`'c' cancela`); `scan --help` / `import --help` document it.
- README examples (EN/ES) show the new prompts.

### Removed
- Promo `assets/` and `MEMORIA.md` removed from version control
  (kept on disk, now git-ignored); history rewritten so they leave no
  trace in the repo. README links to `MEMORIA.md` removed.

## [0.1.0] - 2026-09-27

Initial release: TypeScript/Bun port of the `tabernaculo` CLI, compiled
to a single standalone binary (`bun build --compile`).

### Added
- Commands: `import`, `scan`, `list`, `link`, `unlink`, `remove` (`rm`),
  `clis` (`supported-clis`), `config`, `completion`, `help`.
- 8 agent CLIs (`opencode`, `anthropic`/`claude`, `codex`, `agents`,
  `gemini`, `cursor`, `phi`) with per-CLI destination folders and
  legacy Codex layout.
- Store resolution: `--store` > `$TABERNACULO_HOME` >
  `$TABERNACULO_STORE` > `config.json` > `~/.local/tabernaculo`;
  flat layout plus direct skills-repo layout (e.g. `~/.skills`).
- GitHub and local import (folder, loose `.md`, subpath, branch),
  bulk `scan` (`1,3` / `1-3` / `all`), numbered multi-skill menu on
  terminals, safe symlink `link`/`unlink`, shell completion
  (bash/zsh/fish), bilingual READMEs.
- GitHub Actions release workflow: 6 platform binaries
  (linux/darwin/windows × x64/arm64) on `v*` tags.

[Unreleased]: https://github.com/wcervini/tabernaculo/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/wcervini/tabernaculo/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/wcervini/tabernaculo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/wcervini/tabernaculo/releases/tag/v0.1.0
