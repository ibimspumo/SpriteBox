---
title: Contributing Guidelines
description: How to contribute to SpriteBox
---

We welcome contributions! Here's how to get involved.

## What We Need Help With

- **UI/UX improvements** - Better user experience
- **Accessibility (a11y)** - Screen reader support, keyboard navigation
- **Performance optimization** - Faster rendering, smaller bundles
- **Mobile touch gestures** - Better drawing experience on phones
- **Sound effects** - Audio feedback for actions
- **Bug fixes** - Squash those bugs!
- **Documentation** - Improve these docs
- **Translations** - Add new languages

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR-USERNAME/SpriteBox.git
cd SpriteBox
pnpm install
pnpm dev
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 3. Make Changes

- Follow the existing code style
- Add tests if applicable
- Update documentation if needed

### 4. Test Locally

```bash
pnpm lint          # Check code style
pnpm typecheck     # Check types
pnpm build         # Ensure it builds
```

### 5. Submit PR

- Write a clear PR title and description
- Reference any related issues
- Keep PRs focused on a single change

## Code Style

### TypeScript

- Strict mode enabled
- Use explicit types (avoid `any`)
- Prefer `interface` over `type` for objects

```typescript
// Good
interface Player {
  id: string;
  username: string;
}

// Avoid
type Player = {
  id: any;
  username: any;
};
```

### Svelte

- Use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Follow Atomic Design for components
- Use design tokens for styling

```svelte
<script lang="ts">
  import { Button } from '$lib/components/atoms';

  let count = $state(0);
</script>

<Button onclick={() => count++}>
  Count: {count}
</Button>

<style>
  /* Use design tokens */
  .container {
    padding: var(--space-4);
    border-radius: var(--radius-md);
  }
</style>
```

### Commit Messages

Use conventional commits:

```
feat: add sound effects for voting
fix: correct Elo calculation for ties
docs: update socket events reference
refactor: simplify phase state machine
chore: update dependencies
```

## i18n Requirements

**All user-visible text must be localized.**

### Adding Text

1. Add key to `types.ts`:

```typescript
mySection: {
  myKey: string;
};
```

2. Add to both `en.ts` AND `de.ts`:

```typescript
// en.ts
mySection: {
  myKey: 'My text',
},

// de.ts
mySection: {
  myKey: 'Mein Text',
},
```

3. Use in component:

```svelte
<span>{$t.mySection.myKey}</span>
```

:::caution
PRs with hardcoded English strings will be rejected.
:::

## Security

- Never trust client input
- Always validate with Zod schemas
- Don't expose internal IDs
- No secrets in code (there shouldn't be any anyway)

## Questions?

- Open a [GitHub Issue](https://github.com/ibimspumo/SpriteBox/issues)
- Check existing issues first
- Be specific about the problem
