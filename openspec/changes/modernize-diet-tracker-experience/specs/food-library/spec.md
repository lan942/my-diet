## ADDED Requirements

### Requirement: Everyday foods are available in the built-in library
The built-in food library SHALL include a useful selection of familiar everyday foods in addition to the existing curated dataset. The selection SHALL cover common fruit, dairy, eggs, staple grains, and commonly logged proteins, including familiar examples such as egg, banana, apple, milk, and plain yogurt when not already represented. Each seeded item SHALL include Chinese and English names, plausible per-100g energy and macronutrients, and a preparation basis (such as raw, cooked, or plain) in its name or notes where relevant. Suitable household portion presets SHALL be provided for common countable foods where practical. Seeded content SHALL describe nutrition information without medical claims.

#### Scenario: New installation includes everyday options
- **WHEN** a new installation initializes the food library
- **THEN** the library contains the existing curated foods and the missing everyday examples with bilingual names and nutrition information

#### Scenario: Preparation basis is clear
- **WHEN** a seeded food's nutrition depends on preparation state
- **THEN** its displayed name or notes identify the relevant raw, cooked, or plain basis

### Requirement: Everyday food seeds upgrade existing libraries safely
The application SHALL add missing everyday seed foods to a non-empty existing food library using the established idempotent seed-upgrade path. Matching SHALL use the canonical Chinese seed name. Existing rows SHALL NOT be overwritten or duplicated, and absence of a seed category SHALL NOT prevent other available seeds from being added.

#### Scenario: Upgrade fills missing foods
- **WHEN** an existing installation starts with some everyday seeds absent
- **THEN** each absent seed with an available category is inserted with its complete bilingual data and suitable portions

#### Scenario: Existing same-name item is preserved
- **WHEN** a same-name user food already exists
- **THEN** its nutrition, notes, and portions remain unchanged and no duplicate is inserted

#### Scenario: Repeated startup is idempotent
- **WHEN** startup seed upgrade runs more than once
- **THEN** no duplicate everyday food rows are created
