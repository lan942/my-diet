## MODIFIED Requirements

### Requirement: Consistent modern dual-theme visual system
The application SHALL provide a cohesive visual system in both light and dark themes across Today, Food Library, Profile, onboarding, shared controls, and bottom navigation. Shared colors, spacing, typography, corner radii, and elevation SHALL be defined centrally per theme and consumed through a single theme-resolution mechanism (`ThemeProvider` + `useTheme()` hook); components SHALL NOT import the static light `colors` token object directly. The light token set SHALL remain visually unchanged. The dark token set SHALL define background `#0F172A`, card surface `#1E293B`, and primary text `#F8FAFC`, and SHALL provide a complete counterpart for every color token the light set exposes. Nutrition semantic colors (`macroColors`) SHALL be shared across both themes and SHALL retain their established meaning. Text and controls SHALL maintain readable contrast in both themes and SHALL NOT rely on color alone to communicate status.

#### Scenario: Core screens share visual language in both themes
- **WHEN** a user navigates between Today, Food Library, and Profile with either the light or dark theme active
- **THEN** screen backgrounds, card surfaces, typography hierarchy, spacing, and control shapes are consistent within the active theme while each page preserves its distinct content

#### Scenario: Nutrition colors retain meaning in both themes
- **WHEN** calories, protein, fat, carbohydrate, or steps are shown under either theme
- **THEN** their established semantic colors remain consistent across summaries, labels, and progress indicators

#### Scenario: No static light-token imports remain
- **WHEN** the codebase is inspected after migration
- **THEN** no screen or shared component imports the static light `colors` object for rendering; all colors resolve through the theme hook

## ADDED Requirements

### Requirement: Theme preference selection and persistence
The application SHALL offer a three-state appearance preference: follow system (default), light, and dark. The preference SHALL persist across launches in the app configuration, SHALL tolerate missing or invalid stored values by falling back to follow-system, and SHALL apply immediately upon change without restarting the app. The Profile screen SHALL expose the preference control with localized labels in the Preferences section.

#### Scenario: Default follows system
- **WHEN** a user has never changed the appearance preference
- **THEN** the app renders in the theme matching the current OS appearance and reacts to OS theme changes while running

#### Scenario: Explicit preference overrides system
- **WHEN** a user selects Light or Dark in Profile preferences
- **THEN** the app immediately renders in that theme regardless of OS appearance, and keeps that choice after relaunch

#### Scenario: Invalid stored value falls back safely
- **WHEN** the stored preference is missing or not one of the three valid values
- **THEN** it is normalized to follow-system without crashing

### Requirement: Dark theme visual adaptation
Under the dark theme, the application SHALL adapt system surfaces and depth cues: the React Navigation theme and system status bar SHALL match the active theme; cards SHALL substitute the light-theme soft shadow with a visible 1px outline using the theme line color (dark shadows are imperceptible); and state feedback elements (Toast, sheets, pickers, progress indicators, completion glow) SHALL remain perceivable on dark surfaces.

#### Scenario: Navigation and status bar follow theme
- **WHEN** the dark theme is active
- **THEN** the navigation container background, tab bar, and status bar icon style render in dark-theme colors

#### Scenario: Cards stay delineated on dark background
- **WHEN** cards are rendered on the dark background
- **THEN** each card remains visually separated from the background via its dark card surface and 1px outline, without relying on drop shadows
