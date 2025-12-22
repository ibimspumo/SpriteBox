# Contributing to SpriteBox

First off, thanks for taking the time to contribute! This project thrives because of people like you.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Workflow](#development-workflow)
- [Style Guidelines](#style-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/). By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) 8+
- Git

### Setup

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/spritebox.git
cd spritebox
pnpm install
pnpm dev
```

That's it. No API keys, no database, no environment variables.

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

When filing an issue, include:
- A clear, descriptive title
- Steps to reproduce the behavior
- Expected vs actual behavior
- Browser/OS information
- Screenshots if applicable

### Suggesting Features

Feature requests are welcome! Please:
- Check if the feature has already been suggested
- Explain why this feature would be useful
- Consider how it fits with the project's philosophy (simple, no database, no secrets)

### Code Contributions

#### Good First Issues

Look for issues labeled `good first issue` - these are beginner-friendly tasks.

#### Areas We Need Help

- UI/UX improvements
- Accessibility (a11y)
- Translations (i18n)
- Performance optimization
- Mobile touch gestures
- Sound effects
- Documentation

## Development Workflow

### Branch Naming

```
feature/short-description
fix/issue-number-short-description
docs/what-changed
```

### Commands

```bash
pnpm dev          # Start development servers
pnpm build        # Production build
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript checks
```

### Project Structure

```
apps/
├── server/       # Node.js + Express + Socket.io
└── web/          # Svelte 5 + Vite
```

See [CLAUDE.md](CLAUDE.md) for detailed architecture notes.

## Style Guidelines

### Code Style

- We use ESLint and Prettier - run `pnpm lint` before committing
- TypeScript strict mode is enabled
- Prefer explicit types over `any`

### Commit Messages

Use clear, concise commit messages:

```
Add user avatar component
Fix lobby timer not starting at 5 players
Update README with deployment instructions
```

- Use imperative mood ("Add" not "Added")
- Keep first line under 72 characters
- Reference issues when applicable: `Fix #123`

### TypeScript

```typescript
// Good: Explicit interface
interface Player {
  id: string;
  username: string;
  score: number;
}

// Avoid: any types
function process(data: any) { ... }  // Don't do this
```

### Svelte Components

```svelte
<!-- Use Svelte 5 runes -->
<script lang="ts">
  let count = $state(0);
  let doubled = $derived(count * 2);
</script>
```

## Pull Request Process

### Before Submitting

1. Ensure your code passes linting: `pnpm lint`
2. Ensure TypeScript compiles: `pnpm typecheck`
3. Test your changes locally with `pnpm dev`
4. Update documentation if needed

### PR Guidelines

- Fill out the PR template completely
- Link related issues
- Keep PRs focused - one feature/fix per PR
- Add screenshots for UI changes

### Review Process

1. A maintainer will review your PR
2. Address any requested changes
3. Once approved, a maintainer will merge

### What We Look For

- Does it work?
- Does it follow our style guidelines?
- Is the code readable and maintainable?
- Does it maintain the project philosophy?
  - No external databases
  - No API keys or secrets required
  - Simple to run (`pnpm dev` should just work)

## Project Philosophy

When contributing, keep these principles in mind:

1. **Simplicity** - One command to run, no configuration needed
2. **No Persistence** - Data is intentionally ephemeral (in-memory only)
3. **Server Authority** - Never trust the client, validate everything server-side
4. **Mobile First** - UI should work great on phones
5. **Accessibility** - Everyone should be able to play

## Questions?

Feel free to open an issue with the `question` label or start a discussion.

---

Thank you for contributing!
