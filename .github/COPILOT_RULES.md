# GitHub Copilot Rules

## Package Manager

**MANDATORY**: Use ONLY `pnpm`/`pnpx` in this repository.

### Use these commands:
- Install deps: `pnpm install`
- Add package: `pnpm add <pkg>`
- Add dev dep: `pnpm add -D <pkg>`
- Remove package: `pnpm remove <pkg>`
- Run scripts: `pnpm run <script>` or `pnpm <script>`
- Update deps: `pnpm update`
- Run local CLIs/binaries: `pnpx <bin> [args]` (e.g., `pnpx vite`, `pnpx vitest`, `pnpx @biomejs/biome`)

### DO NOT use:
- `npm ...`, `npx ...`
- `yarn ...`
- `bun ...`

If Corepack is involved, it MUST resolve to pnpm under the hood and surface the `pnpm`/`pnpx` commands.

## Workflow Rules

**CRITICAL**: After ANY code change, ensure the dev server is running via `pnpm dev`.

- If a server is already running, rely on HMR.
- If not running (CI/automation, fresh session), start it with `pnpm dev`.
- Prefer a single server instance; restart only if config changes require it.

## Project Standards

- Use modern JavaScript (ES2022+)
- Prefer vanilla JavaScript over frameworks when possible
- Use CSS custom properties for theming and responsive design
- Follow semantic HTML practices
- Ensure accessibility with proper ARIA labels and focus management
- Write JSDoc comments for all functions
- Use Biome for linting and Prettier for formatting (HTML/CSS/JSON only)
- Write tests using Vitest for all utilities and core functionality

## Build & Development

- Development server: `pnpm dev`
- Production build: `pnpm build`
- Linting: `pnpm lint`
- Testing: `pnpm test`
- Formatting: `pnpm format`

## Architecture Notes

- Keep animation utilities in `src/runtime/`
- Main application logic in `src/index.js` as a class
- CSS uses CSS trigonometry for radial layouts
- Preserve transform state using WeakMap for cross-browser stability

## Docs & Comments Style guide
- Use JSDoc for documenting functions and methods
- Use `//` for inline comments
- Use `/* ... */` for block comments
- Write comments in English
- Keep comments concise and relevant to the code they describe
- Avoid redundant comments that do not add value
- Update comments when the associated code changes to ensure accuracy
- Use comments to explain the "why" behind complex logic, not just the "what"
- Maintain a consistent commenting style throughout the codebase
- Use comments to separate sections of code for better readability
- Avoid over-commenting; trust that well-written code is often self-explanatory


