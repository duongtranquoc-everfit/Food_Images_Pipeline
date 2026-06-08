## ADDED Requirements

### Requirement: Context menu on images
The system SHALL register a context menu item "Use this image" that appears when right-clicking on any image on any webpage.

#### Scenario: Right-click on image
- **WHEN** user right-clicks on an image element on any webpage
- **THEN** the context menu shows "Use this image" option

### Requirement: Capture best quality image URL
The system SHALL extract the best quality image URL from the right-clicked element, prioritizing: `currentSrc` > largest `srcset` entry > `data-src` > `src`.

#### Scenario: Image with srcset
- **WHEN** user clicks "Use this image" on an image that has a `srcset` attribute
- **THEN** system extracts the largest resolution URL from `srcset`

#### Scenario: Image with simple src
- **WHEN** user clicks "Use this image" on a simple `<img>` with only `src`
- **THEN** system captures the `src` URL

#### Scenario: Lazy-loaded image
- **WHEN** user clicks "Use this image" on an image with `data-src` attribute
- **THEN** system prefers `data-src` over a placeholder `src`

### Requirement: Image selection table in side panel
The system SHALL display a table with columns: row number, food name, and image URL. The table is populated from sheet data.

#### Scenario: Table display
- **WHEN** Stage 2 is active
- **THEN** side panel shows a scrollable table with all food items and their current image URL status (filled or empty)

### Requirement: Active row management
The system SHALL highlight the currently active row. The active row receives the next captured image URL.

#### Scenario: Auto-advance to next empty row
- **WHEN** an image URL is captured for the active row
- **THEN** the active row automatically advances to the next row without an image URL

#### Scenario: Manual row selection
- **WHEN** user clicks on any row in the table
- **THEN** that row becomes the active row, allowing the user to replace its image URL

### Requirement: Image URL replacement with confirmation
The system SHALL allow replacing an already-filled image URL by setting that row as active and capturing a new image, with a confirmation prompt.

#### Scenario: Replace existing URL — confirm
- **WHEN** user captures a new image for a row that already has an image URL
- **THEN** system shows a confirmation modal "Replace existing image for [food name]?"

#### Scenario: Replace confirmed
- **WHEN** user confirms the replacement
- **THEN** the new URL replaces the old one

#### Scenario: Replace cancelled
- **WHEN** user cancels the replacement
- **THEN** the existing URL is kept and the active row does not change

### Requirement: Advance to processing
The system SHALL provide a button to advance to Stage 3 when at least one row has an image URL.

#### Scenario: Proceed button
- **WHEN** user clicks "Done & Next Step"
- **THEN** system validates that at least one row has an image URL and advances to Stage 3
