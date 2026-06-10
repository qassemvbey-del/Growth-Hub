---
trigger: always_on
---

## Safety Rules
- Before any change, show me the plan first and wait for approval
- Never modify more than one file at a time
- After each change, run: npx tsc --noEmit
- Never delete code, only comment it out

## Code Style
- Use TypeScript interfaces, never use `any`
- Split logic from UI into custom hooks
- No inline styles, use Tailwind classes