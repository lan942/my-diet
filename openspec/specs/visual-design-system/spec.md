# visual-design-system Specification

## Purpose
Defines the cohesive visual language of NutriPulse across light and dark themes: shared color tokens, spacing, typography, radii, elevation, semantic nutrition colors, iconography, and layout rules that keep every screen consistent, readable, and accessible.
## Requirements
### Requirement: Consistent modern light visual system
The application SHALL provide a cohesive light-theme visual system across Today, Food Library, Profile, onboarding, shared controls, and bottom navigation. Shared colors, spacing, typography, corner radii, and elevation SHALL be defined centrally and reused. Nutrition semantic colors SHALL retain their established meaning. Text and controls SHALL maintain readable contrast and SHALL NOT rely on color alone to communicate status.

#### Scenario: Core screens share visual language
- **WHEN** a user navigates between Today, Food Library, and Profile
- **THEN** screen backgrounds, card surfaces, typography hierarchy, spacing, and control shapes are consistent while each page preserves its distinct content

#### Scenario: Nutrition colors retain meaning
- **WHEN** calories, protein, fat, carbohydrate, or steps are shown
- **THEN** their established semantic colors remain consistent across summaries, labels, and progress indicators

### Requirement: Consistent, accessible iconography
The application SHALL use a consistent bundled icon family for the launcher mark, tabs, and in-app actions. Primary tab destinations SHALL retain visible text labels. Icon-only actions SHALL expose localized accessibility labels and a usable touch target, and their selected/disabled states SHALL be perceivable without relying on color alone. Functional controls SHALL NOT use emoji as icons.

#### Scenario: Icon-only action is accessible
- **WHEN** a user navigates to an icon-only action with assistive technology
- **THEN** the action exposes a localized name and its purpose is understandable

#### Scenario: Tab destinations remain identifiable
- **WHEN** a user views the bottom navigation in active or inactive state
- **THEN** each destination has a legible text label and a consistent corresponding icon

### Requirement: Visual refresh preserves usable screen layouts
The refreshed core screens and shared components SHALL keep all existing primary actions reachable, content scrollable, and text readable under supported dynamic type and device constraints. Empty, loading, validation, and failure states SHALL provide clear feedback consistent with the visual system.

#### Scenario: Long text and large font remain usable
- **WHEN** system text scaling is increased while viewing a core screen
- **THEN** text and controls remain visible through wrapping or scrolling without overlap or clipping

#### Scenario: Empty and failure states are clear
- **WHEN** a list is empty or a core operation fails
- **THEN** the user sees a clear explanatory state and, when appropriate, an available next action

