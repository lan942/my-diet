## Context

The app is a local-first Expo/React Native nutrition tracker with three bottom tabs (Today, Food, Profile), centralized light-theme tokens, Ionicons, SQLite food seeds, and Chinese/English localization. Existing specs already define nutrition color semantics, safe areas, large text, 375×667 usability, 640px content constraints, and idempotent seed upgrades. This change should improve the product's visual coherence without weakening those contracts or changing nutrition/logging semantics.

The screen review found one-line truncation on food names, food notes, and Profile summaries; small touch areas for date arrows and food actions; a fixed-width unit switch that could crowd narrow screens; and unwrapping progress, meal, and quick-log rows. The implementation removes unnecessary truncation, gives controls at least 44px targets, and allows content rows to wrap or scroll.

## Goals / Non-Goals

**Goals:**
- Give the core app screens, navigation, and shared controls one polished, calm visual language.
- Make functional iconography consistent, understandable, and accessible.
- Identify and fix concrete usability defects encountered in the three core screens and their shared components.
- Make first-run logging easier with familiar, clearly named food items and practical portion presets.

**Non-Goals:**
- Dark mode, a new navigation structure, remote food search, barcode scanning, social features, or a new nutrition calculation model.
- Replacing SQLite, changing existing user food/log data, or requiring a new runtime dependency.
- Making medical or therapeutic claims about foods.

## Decisions

1. **Extend the existing token and component system.** Keep `src/theme.ts` as the source of truth for color, spacing, radius, typography, and elevation tokens; update shared components and apply them consistently to Today, Food, Profile, and tab navigation. Preserve the established semantic colors for calories, macros, and steps. Alternatives considered: screen-local styling would be quicker per screen but prolong inconsistencies; a new styling framework adds migration and dependency cost without solving a domain need.

2. **Use the installed Ionicons set consistently.** Refresh the app mark and tab/action icon choices using the existing `@expo/vector-icons` dependency, with active/inactive states from one mapping, appropriate hit targets, and localized accessibility labels. Keep text labels for primary navigation and actions. Alternatives considered: emoji are inconsistent across platforms; adding an icon package is unnecessary because Ionicons is already installed. Any launcher asset changes should use a bundled local asset and remain legible at small sizes.

3. **Treat layout defects as part of the visual pass.** Inspect the three primary screens, navigation, and shared components for spacing, contrast, truncation, misaligned controls, unclear empty/error states, and inaccessible icon actions. Fix only defects in these flows, retaining the current product behavior and accessibility contracts. Do not broaden into unrelated service/data refactors.

4. **Add common foods as additive, idempotent seeds.** Extend the existing seed dataset with a concise everyday set not already represented (for example egg, banana, apple, milk, plain yogurt, and common meat/staple choices). Store per-100g values with clear raw/cooked state in names or notes and suitable household portions where practical. Use nutrition values that are internally plausible and traceable to a consistent authoritative reference during implementation; avoid health claims. Insert only missing canonical seed names and never overwrite user-created or edited rows. Alternatives considered: replacing the curated set would disrupt existing expectations and users; remote data would violate the offline-first design.

5. **Preserve localization and responsive behavior by construction.** Any new visible strings and seed names/notes include Chinese and English variants. Layouts continue to use safe-area-aware, scrollable, content-sized containers, existing max-width rules, and bounded dynamic font scaling. Existing user logs, IDs, backups, and nutrition calculations stay compatible.

## Risks / Trade-offs

- **Visual polish can reduce density or increase scrolling** → Prefer clearer hierarchy and responsive spacing while retaining all existing data and actions; keep content scrollable and check small-screen layouts.
- **Nutrition values vary by preparation and source** → Label raw/cooked basis explicitly, use one reference source per dataset where practical, and review the seed values and portions as data rather than implying medical precision.
- **Icon refresh can reduce discoverability** → Keep text labels on tabs and accessible labels/hit areas on icon-only controls.
- **Live layout preview is unavailable in this workspace** → Type checking and a source-level 375×667/dynamic-type layout review are used here; the Expo web preview could not start because `react-dom` and `react-native-web` are not installed, and those packages are outside this change's dependency scope.
- **Existing libraries may contain same-name custom entries** → Match canonical seed names and insert only missing rows; never update existing rows during startup.

## Migration Plan

No destructive database migration is expected. Add new food seeds through the existing startup seed/upgrade path using idempotent inserts. Existing records and backup formats remain unchanged. Rollback consists of reverting the app release; already inserted food rows remain ordinary user-visible library entries and must not be deleted automatically.

## Open Questions

- Final visual details (accent shade, corner radii, and launcher artwork) should be chosen against the existing app identity during implementation, while respecting the requirements in `visual-design-system`.
- The final common-food list and nutrition reference should be confirmed while implementing the dataset, avoiding duplicates already present in the bundled library.
