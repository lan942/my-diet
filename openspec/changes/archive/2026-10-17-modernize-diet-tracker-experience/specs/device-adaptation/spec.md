## ADDED Requirements

### Requirement: Refreshed screens retain device and accessibility adaptation
The visual refresh SHALL preserve the existing device-adaptation requirements for dynamic type, small screens, safe areas, and large-screen content width. New or changed controls SHALL remain reachable and operable without horizontal scrolling on supported phone layouts. Icon-only controls SHALL provide accessible names and adequate touch targets.

#### Scenario: Refreshed screens fit a small phone
- **WHEN** the user opens Today, Food Library, or Profile on a 375×667 logical-pixel screen
- **THEN** content has no horizontal overflow and all primary actions remain reachable by scrolling or tapping

#### Scenario: Safe areas remain respected
- **WHEN** the app is displayed on a device with a cutout or gesture navigation inset
- **THEN** refreshed headers, content, and navigation controls are not obscured

#### Scenario: Large text does not clip refreshed controls
- **WHEN** the user enables large system text on a refreshed screen
- **THEN** labels wrap or scroll and controls grow as needed without clipping or overlap
