# Autosave v2 QA Notes

_Date_: October 18, 2025  
_Owner_: Codex (GPT-5)

## Scenario Checklist

### 1. Conflict Resolution Flow
- **Setup**: Trigger `409` by sending stale `baseHash` to `POST /api/documents/[id]/autosave`.
- **Expectation**: API returns `{ status: 'conflict', hash, document }`.
- **Client**: Editor surfaces modal with latest server HTML and options to keep or replace.
- **Result**: ✅ Verified via code walkthrough; manual API probe recommended during staging QA.

### 2. Keep Local Changes
- **Action**: Dismiss modal via “Keep my changes”.
- **Expectation**: Autosave status returns to `pending`, user content remains untouched, timer reschedules save.
- **Result**: ✅ Observed by inspecting React state transitions (no unintended resets).

### 3. Replace With Saved Version
- **Action**: Select “Replace with saved version”.
- **Expectation**: Editor swaps HTML/structure to server payload, anchors recomputed, hash updated, status becomes `saved`.
- **Result**: ✅ Confirmed by stepping through `onReplaceWithServer` handler; base hash recalculates and dirty flag clears.

### 4. Offline Mode
- **Action**: Disable network (DevTools offline) and type.
- **Expectation**: Autosave abort falls back to `offline` status and retries once connection restored.
- **Result**: ⚠️ Pending manual verification; handler routes to `offline` branch (code path confirmed).

### 5. Connectivity Recovery
- **Action**: Toggle browser offline → online while unsaved edits exist.
- **Expectation**: Status moves from `offline`/`error` back to `pending`, autosave re-runs automatically.
- **Result**: ✅ Verified via new online listener triggering `performAutosave`; manual confirmation recommended.

### 6. Conflict Dismissal (Keep Local)
- **Action**: Trigger conflict, choose “Keep my changes”.
- **Expectation**: Modal closes, autosave retries immediately with refreshed `baseHash`.
- **Result**: ✅ `onCloseConflict` now clears conflict state and invokes `performAutosave`.

### 7. Theme Regression (Light/Dark)
- **Action**: Toggle `document.documentElement.classList` between default and `dark`.
- **Expectation**: Backgrounds, buttons, toasts, and network graph adopt grayscale palette with sufficient contrast.
- **Result**: ✅ Inspected Tailwind tokens + relationship graph palette switch; manual browser check still recommended.

## Manual Verification Notes
- Run `npm run lint` and `npm run build` (both pass) before exercising UI.
- For API validation, use Supabase-authenticated `curl` or the built-in editor in two browser sessions to force a conflict.
- Capture screenshots for light/dark comparisons to attach to design sign-off.

## Outstanding Items
- Automate offline regression with Playwright by mocking `navigator.onLine` and intercepting fetch.
- Capture telemetry in a follow-up to measure conflict frequency (`TODO`).
