# Chromatic Quick Start Guide

This guide will help you get Chromatic visual regression testing set up for the Ottowrite project in under 10 minutes.

## What is Chromatic?

Chromatic is a visual testing platform that:
- Automatically detects visual changes in your UI components
- Hosts your Storybook for free
- Provides a review workflow for visual changes
- Integrates with GitHub PR checks

## Prerequisites

- GitHub repository with admin access
- Storybook already configured (✅ already done)
- Stories created for components (✅ we have some stories)

## Setup Steps

### 1. Create Chromatic Account (2 minutes)

1. Go to [https://www.chromatic.com/](https://www.chromatic.com/)
2. Click **Sign up** or **Get started**
3. Choose **Sign up with GitHub**
4. Authorize Chromatic to access your GitHub account

### 2. Add Your Project (1 minute)

1. Click **Add project** or **Choose from GitHub**
2. Select the **ottowrite** repository
3. Chromatic will show you a project token
4. **Copy the project token** (you'll need it in the next step)

### 3. Add Secret to GitHub (2 minutes)

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/ottowrite`
2. Click **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Name: `CHROMATIC_PROJECT_TOKEN`
6. Value: Paste the token from Chromatic
7. Click **Add secret**

### 4. Test the Setup (5 minutes)

The workflow is already configured in `.github/workflows/pr-gate.yml`. To test it:

1. Create a test branch:
   ```bash
   git checkout -b test-chromatic-setup
   ```

2. Make a small visual change to a component or create a new story:
   ```bash
   # Example: Edit an existing story or create a new one
   # Just to trigger the workflow
   echo "// test" >> stories/ui/Badge.stories.tsx
   ```

3. Commit and push:
   ```bash
   git add .
   git commit -m "Test Chromatic setup"
   git push -u origin test-chromatic-setup
   ```

4. Create a pull request on GitHub

5. Watch the "Visual Regression Tests" check run

6. Once it completes, click the **Details** link to view your components in Chromatic

### 5. Review Visual Changes

When Chromatic detects visual changes:

1. Click the **Visual Regression Tests** check in your PR
2. Click **View build on Chromatic**
3. Review the visual diffs:
   - Green = additions
   - Red = deletions
   - Yellow = changes
4. For each change:
   - Click **Accept** if intentional
   - Click **Deny** if it's a bug
5. Once all changes are reviewed, the PR check will pass

## Daily Workflow

### For Developers

1. Make component changes
2. Update or add stories if needed
3. Push to your PR branch
4. Chromatic automatically runs
5. Review visual changes in Chromatic UI
6. Accept intentional changes, fix bugs

### For Reviewers

1. Review code changes as usual
2. Check Chromatic for visual changes
3. Verify changes match PR description
4. Approve or request changes

## Local Development

### Run Storybook Locally

```bash
# Start Storybook dev server
npm run storybook
```

Open [http://localhost:6006](http://localhost:6006) to view your stories.

### Build Storybook

```bash
# Build static Storybook
npm run build-storybook
```

### Publish to Chromatic Manually

```bash
# Publish to Chromatic (requires CHROMATIC_PROJECT_TOKEN in env)
npm run chromatic
```

## Understanding the Workflow

### What Happens on Pull Requests

1. **Build**: Storybook is built with your changes
2. **Snapshot**: Chromatic captures screenshots of all stories
3. **Compare**: Screenshots are compared to the baseline (main branch)
4. **Report**: Visual changes are reported in the PR check
5. **Review**: You review and accept/deny changes
6. **Pass/Fail**: PR check passes only after all changes are reviewed

### What Happens on Main Branch

1. **Build**: Storybook is built
2. **Snapshot**: Screenshots are captured
3. **Auto-accept**: All changes are automatically accepted
4. **Baseline**: New screenshots become the baseline for future PRs
5. **Publish**: Storybook is published to Chromatic

### Visual Change Detection

Chromatic detects:
- Layout changes
- Color changes
- Font changes
- Spacing changes
- Content changes
- Animation changes (in certain modes)

## Configuration

### Current Settings

Our Chromatic configuration in `.github/workflows/pr-gate.yml`:

```yaml
- name: Publish to Chromatic
  uses: chromaui/action@latest
  with:
    projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
    buildScriptName: build-storybook
    exitZeroOnChanges: false        # Fail PR if changes detected
    onlyChanged: true                # Only test changed stories
    autoAcceptChanges: main          # Auto-accept on main branch
```

### Customization Options

You can customize by adding these parameters:

```yaml
# Skip Chromatic on specific commits
skip: 'dependabot/**'

# Ignore specific stories
externals: 'public/**'

# Set custom exit codes
exitOnceUploaded: true

# Debug mode
debug: true
```

See [Chromatic Action docs](https://github.com/chromaui/action) for all options.

## Common Use Cases

### Creating a New Component Story

1. Create component in `components/`
2. Create story in `stories/`
3. Follow the pattern from existing stories:

```typescript
// stories/ui/MyComponent.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MyComponent } from '@/components/ui/my-component'

const meta: Meta<typeof MyComponent> = {
  title: 'UI/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MyComponent>

export const Default: Story = {
  args: {
    // component props
  },
}

export const Variant: Story = {
  args: {
    // different props
  },
}
```

### Testing Responsive Design

```typescript
export const Mobile: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
}

export const Tablet: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
}
```

### Testing Dark Mode

```typescript
export const Dark: Story = {
  parameters: {
    backgrounds: {
      default: 'dark',
    },
  },
}
```

## Troubleshooting

### "No project token found" Error

**Problem**: Chromatic can't find the project token

**Solution**: Verify `CHROMATIC_PROJECT_TOKEN` is set in GitHub secrets

### Build Fails in Chromatic

**Problem**: Storybook build fails in CI

**Solution**:
1. Run `npm run build-storybook` locally
2. Fix any errors
3. Push the fix

### Too Many Snapshots

**Problem**: Chromatic is capturing too many snapshots

**Solution**: Use `onlyChanged: true` (already configured)

### Changes Not Detected

**Problem**: You made visual changes but Chromatic doesn't detect them

**Solution**:
1. Verify the component has a story
2. Check the story is being built
3. Ensure the change is actually visual
4. Try rebuilding locally

### Review UI Not Loading

**Problem**: Can't see visual diffs in Chromatic UI

**Solution**:
1. Clear browser cache
2. Try different browser
3. Check Chromatic status page
4. Wait a few minutes and refresh

## Best Practices

### Story Organization

```
stories/
├── ui/              # Basic UI components (Button, Badge, etc.)
├── outlines/        # Outline-related components
├── plot-analysis/   # Plot analysis components
└── ...
```

### Story Naming

- Use descriptive names: `Default`, `Loading`, `Error`, `WithLongText`
- Follow consistent patterns across similar components
- Use PascalCase for story names

### What to Test Visually

✅ **Do test**:
- UI components
- Layout components
- Different states (loading, error, empty)
- Responsive variations
- Theme variations

❌ **Don't test**:
- Server-side logic
- API calls
- Database operations
- Authentication flows

### Performance Tips

1. **Only snapshot what matters**: Don't create stories for every prop combination
2. **Use `onlyChanged`**: Only test changed stories (already configured)
3. **Optimize images**: Use appropriate image sizes in stories
4. **Limit animations**: Disable animations in tests when possible

## Resources

- [Chromatic Documentation](https://www.chromatic.com/docs/)
- [Storybook Documentation](https://storybook.js.org/)
- [Our Stories](../stories/)
- [Full CI/CD Setup Guide](./CI_CD_SETUP.md)

## Next Steps

1. ✅ Create Chromatic account
2. ✅ Add project token to GitHub
3. ✅ Test with a PR
4. 📝 Create stories for remaining components
5. 📝 Set up branch protection rules
6. 📝 Document component guidelines

---

**Questions?** Check the [Full CI/CD Setup Guide](./CI_CD_SETUP.md) or ask in the team chat.
