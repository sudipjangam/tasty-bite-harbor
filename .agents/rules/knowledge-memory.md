---
trigger: always_on
---

# Fast Workspace Memory Rules

1. **Read `./docs/SESSION_MEMORY.md` FIRST** before searching or reading source files — it holds verified file paths, exact line ranges for large monoliths, DB schema facts, and active invariants.
2. **Jump straight to line offsets** (`read_file` with narrow `StartLine`/`EndLine`). Never read whole files >250 lines unless refactoring the full file.
3. **Skip heavy legacy docs by default:** `./docs/CODEBASE_CATALOG.md`, `./docs/COMPONENTS_DETAILS.md`, `./docs/FILE_REFERENCE_MAP.md`, and `./docs/franchise_migration_analysis.md` are **on-demand references only** — open them ONLY when adding new routes, unknown features, or franchise DB changes.
4. **Do NOT re-verify settled invariants** listed in `./docs/SESSION_MEMORY.md` (schema columns, RLS symmetry, Android Photo Picker, `syncManager` IDB behavior) unless a migration or relevant file changed since.
5. **Keep `./docs/SESSION_MEMORY.md` updated** (compact bullets only, <200 lines) after major fixes/refactors or shifts in line numbers.
