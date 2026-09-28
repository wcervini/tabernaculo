# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/wcervini/tabernaculo/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/wcervini/tabernaculo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/wcervini/tabernaculo/releases/tag/v0.1.0
