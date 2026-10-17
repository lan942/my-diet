## Why

The app already supports daily food logging, nutrition summaries, steps, and a searchable food library, but its visual language is still a collection of basic cards and controls rather than a consistent, polished product experience. The built-in food set also leans toward curated “superfoods” and misses familiar everyday staples, making routine logging slower for new users.

## What Changes

- Establish a cohesive modern light-theme visual system for navigation, screen headers, cards, controls, empty states, and feedback, while retaining clear nutrition color semantics.
- Refresh app and in-app iconography with a consistent, legible icon style and accessible labels; avoid emoji as functional icons.
- Review Today, Food Library, and Profile flows for visible usability and consistency defects and correct issues found within this scope.
- Expand the bundled food library with common foods and practical cooked/raw serving assumptions, bilingual names, nutrition values, and portions where appropriate; keep existing user data intact and seed upgrades idempotent.
- Preserve localization, dynamic font scaling, safe areas, and narrow-screen usability through the redesign.

## Capabilities

### New Capabilities

- `visual-design-system`: Shared visual and iconography rules for the app's core screens and navigation.

### Modified Capabilities

- `food-library`: Expand the everyday built-in food dataset and define how those seeds are added to existing libraries without overwriting user data.
- `device-adaptation`: Keep the responsive and accessibility requirements explicit for refreshed screen layouts and icon controls.

## Impact

- UI: `App.tsx`, `src/theme.ts`, `src/screens/IntakeScreen.tsx`, `src/screens/FoodLibraryScreen.tsx`, `src/screens/ProfileScreen.tsx`, and shared components under `src/components/`.
- Food data: `src/services/foodService.ts`, database seed/migration code under `src/db/`, and food-library specifications.
- Localization and accessibility labels in `src/i18n/`.
- No planned new runtime dependency or remote service; existing SQLite data and logging behavior remain compatible.
