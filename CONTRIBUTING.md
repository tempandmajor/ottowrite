# Contributing to OttoWrite

Thank you for your interest in contributing to OttoWrite! This document provides guidelines and best practices for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Database Migrations](#database-migrations)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)

---

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment for all contributors

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop (for local Supabase)
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/ottowrite.git
cd ottowrite

# Install dependencies
npm install

# Start local Supabase (requires Docker)
npx supabase start

# Start development server
npm run dev
```

### Project Structure

```
ottowrite/
├── app/                    # Next.js app router
├── components/             # React components
├── lib/                    # Utility functions and shared code
├── supabase/
│   └── migrations/         # Database migrations
├── docs/
│   ├── architecture/       # ADRs and architecture docs
│   └── database/           # Database documentation
├── scripts/                # Utility scripts
└── __tests__/             # Test files
```

---

## Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**:
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

4. **Commit your changes** using conventional commits

5. **Push and create a pull request**

---

## Database Migrations

Database migrations are how we manage schema changes. **Always** create migrations for database changes.

### Quick Start

```bash
# Create a new migration from template
cp supabase/migrations/.template.sql \
   supabase/migrations/$(date +%Y%m%d%H%M%S)_your_migration_name.sql

# Edit the migration file
# - Fill in the header with migration details
# - Add your schema changes
# - Include rollback instructions

# Test locally
npx supabase db reset  # Fresh database test
npx supabase db push   # Existing database test

# Lint the migration
./scripts/lint-migrations.sh supabase/migrations/20251025*.sql
```

### Migration Guidelines

**Naming Convention:**
```
YYYYMMDDHHMMSS_action_target.sql

Examples:
20251025120000_create_projects_table.sql
20251025120100_add_projects_folder_id_column.sql
20251025120200_add_projects_folder_id_index.sql
```

**Required Sections:**
- Header with migration metadata (purpose, impact, rollback)
- Pre-flight checks (verify prerequisites)
- Migration body (actual schema changes)
- Post-migration validation (verify success)
- Rollback instructions

**Best Practices:**
- ✅ Use the migration template
- ✅ One logical change per migration
- ✅ Include pre-flight and post-flight checks
- ✅ Document rollback instructions
- ✅ Use `IF NOT EXISTS` / `IF EXISTS` for idempotency
- ✅ Use `CREATE INDEX CONCURRENTLY` for zero downtime
- ✅ Test on fresh database (reset) and existing database (push)
- ✅ Run the migration linter before committing

**Anti-Patterns:**
- ❌ Multiple unrelated changes in one migration
- ❌ No rollback documentation
- ❌ Hardcoded UUIDs or sensitive data
- ❌ Missing validation checks
- ❌ Large monolithic migrations (>150 lines)

### Linting Migrations

```bash
# Lint all migrations
./scripts/lint-migrations.sh

# Lint specific migration
./scripts/lint-migrations.sh supabase/migrations/20251025*.sql
```

The linter checks for:
- Migration header completeness
- Rollback instructions
- Dangerous operations (DROP, TRUNCATE, DELETE without WHERE)
- Missing `CONCURRENTLY` on index operations
- Hardcoded UUIDs
- RLS policy presence
- File size (warns if >200 lines)
- **Index naming conventions** (must use `idx_` prefix)

### Full Documentation

For comprehensive migration guidelines, see:
- **[Database Migration Guidelines](docs/database/migration-guidelines.md)** - Best practices for migrations
- **[Naming Conventions](docs/database/naming-conventions.md)** - Standards for database objects

---

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow existing code style (enforced by ESLint)
- Prefer functional components and hooks
- Use meaningful variable names
- Add JSDoc comments for public APIs

```typescript
// Good
interface UserPreferences {
  theme: 'light' | 'dark'
  language: string
}

function getUserPreferences(userId: string): Promise<UserPreferences> {
  // Implementation
}

// Bad
function getPrefs(id: string): Promise<any> {
  // Implementation
}
```

### React Components

- Use functional components
- Keep components focused (single responsibility)
- Extract reusable logic into custom hooks
- Use TypeScript for prop types

```tsx
// Good
interface ButtonProps {
  onClick: () => void
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}

export function Button({ onClick, children, variant = 'primary' }: ButtonProps) {
  return (
    <button className={`btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  )
}

// Bad
export function Button(props: any) {
  return <button onClick={props.onClick}>{props.children}</button>
}
```

### File Organization

- Co-locate related files
- Use index.ts for public exports
- Keep files focused (<300 lines)
- Group imports: external, internal, relative

```typescript
// Good
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from './hooks/use-auth'

// Bad
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useAuth } from './hooks/use-auth'
```

---

## Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for clear, structured commit messages.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic changes)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks
- **ci**: CI/CD changes

### Examples

```
feat(editor): add autosave functionality

Implemented autosave that triggers every 30 seconds when there are
unsaved changes. Includes visual indicator of save status.

Closes #123
```

```
fix(db): resolve RLS policy conflict in project_folders

Consolidated duplicate SELECT and FOR ALL policies into single policy.
Reduces policy count from 12 to 3.

Closes DB-001
```

```
docs(migration): add comprehensive migration guidelines

Created migration template, guidelines document, and linting script
to improve database migration quality and maintainability.

Closes DB-006
```

### Commit Message Checklist

- [ ] Type is present and correct
- [ ] Scope is relevant (optional but recommended)
- [ ] Subject is concise (<72 characters)
- [ ] Body explains what and why (not how)
- [ ] References related issues/tickets
- [ ] Breaking changes noted in footer (if applicable)

---

## Pull Request Process

### Before Creating a PR

1. **Update your branch**:
   ```bash
   git checkout main
   git pull origin main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Run all checks**:
   ```bash
   npm run lint        # ESLint
   npm run type-check  # TypeScript
   npm test            # Tests
   ./scripts/lint-migrations.sh  # Migration linter (if DB changes)
   ```

3. **Review your changes**:
   ```bash
   git diff main
   ```

### Creating a PR

1. Push your branch:
   ```bash
   git push origin your-feature-branch
   ```

2. Create PR on GitHub with:
   - Clear title following commit conventions
   - Description of changes
   - Screenshots/videos for UI changes
   - Testing instructions
   - Links to related issues

### PR Template

```markdown
## Description
[Describe what this PR does and why]

## Changes
- [List specific changes]
- [Use bullet points]

## Testing
- [ ] Tested locally
- [ ] Added/updated tests
- [ ] Ran linters
- [ ] Tested on fresh database (if DB changes)

## Screenshots
[If UI changes]

## Related Issues
Closes #123
```

### Review Process

- PRs require at least 1 approval
- Address review comments
- Keep PR focused (one feature/fix per PR)
- Update PR if main branch changes

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- path/to/test.test.ts

# Run with coverage
npm test -- --coverage
```

### Writing Tests

- Write tests for new features
- Update tests for changed behavior
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

```typescript
import { describe, it, expect } from 'vitest'
import { calculateTotal } from './utils'

describe('calculateTotal', () => {
  it('should sum array of numbers correctly', () => {
    // Arrange
    const numbers = [1, 2, 3, 4, 5]

    // Act
    const result = calculateTotal(numbers)

    // Assert
    expect(result).toBe(15)
  })

  it('should return 0 for empty array', () => {
    expect(calculateTotal([])).toBe(0)
  })
})
```

### Test Database Migrations

```bash
# Test fresh database
npx supabase db reset

# Test existing database
npx supabase db push

# Verify schema
psql -c "\d table_name"
```

---

## Questions or Issues?

- Check existing issues on GitHub
- Review documentation in `/docs`
- Ask in team discussions
- Create a new issue if needed

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to OttoWrite! 🎉
