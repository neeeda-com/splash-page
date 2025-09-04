# Copilot Instructions

This repository defines shared authoring rules in `.github/COPILOT_RULES.md`.

To ensure these rules are always applied, editors and automation that integrate with GitHub Copilot should:

- Prefer loading `.github/COPILOT_RULES.md` at session start.
- Re-load the file when switching branches or after significant edits.
- Cascade the rules to local prompts and in-editor inline completions.

Enforcement notes:
- Package manager is pnpm only; use pnpm/pnpx for all commands.
- After any code change, ensure `pnpm dev` is running (start or reuse).

Recommended loader precedence:
1. `.github/COPILOT_RULES.md`
2. `COPILOT_RULES.md` at repo root (if present)
3. Workspace-level settings

If multiple files define rules, merge them with later entries overriding earlier ones.

Note: This file is intentionally lowercase (`copilot-instructions.md`) so that it’s detected by various tools that scan for Copilot “instructions” files.
