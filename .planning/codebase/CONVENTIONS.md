# Conventions

## Code Style & Patterns
- **Language**: TypeScript throughout the repository.
- **Component Design**: Functional components using React Hooks (`useState`, `useEffect`).
- **Styling**: Tailwind CSS is used extensively with utility classes directly applied in components. Custom additions configured in `tailwind.config.cjs`.
- **Database Access**: Direct usage of `@supabase/supabase-js` heavily routed through `services/supabaseService.ts` representing a unified wrapper.
- **SQL Updates**: SQL migrations and setup functions are written defensively and included in standalone `.sql` files at the root level, typically tested via raw text commands.

## Documentation
- Workflows, checklists, and fixes are thoroughly documented in markdown files at the root directory (e.g., `*_COMPLETE.md` and `*_GUIDE.md` files).
- GSD (Get Shit Done) workflows and `.planning` structured documents represent the agentic operations structure.
