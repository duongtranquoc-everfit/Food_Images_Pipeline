## ADDED Requirements

### Requirement: Connect to Google Sheet by URL
The system SHALL accept a Google Sheet URL, extract the spreadsheet ID, and validate access via Sheets API.

#### Scenario: Valid sheet URL
- **WHEN** user enters a valid Google Sheet URL
- **THEN** system extracts the spreadsheet ID and fetches sheet metadata (title, tabs)

#### Scenario: Invalid or inaccessible URL
- **WHEN** user enters an invalid URL or a sheet they don't have access to
- **THEN** system displays an error message explaining the issue

### Requirement: Tab selection
The system SHALL display a dropdown of all tabs in the connected sheet and allow the user to select one.

#### Scenario: Multiple tabs
- **WHEN** a sheet with multiple tabs is connected
- **THEN** system populates a dropdown with all tab names, defaulting to the first tab

### Requirement: Column mapping
The system SHALL allow the user to map the food name column. The image URL column is initially empty and will be populated through the pipeline.

#### Scenario: Column mapping selection
- **WHEN** a tab is selected
- **THEN** system reads the header row and displays a dropdown selector for "Name column"

### Requirement: Fetch row data
The system SHALL fetch all rows from the selected tab and columns after mapping is confirmed.

#### Scenario: Data fetched
- **WHEN** user confirms column mapping and clicks "Load Data"
- **THEN** system fetches all non-empty rows with name and image URL values and stores them for the pipeline

### Requirement: Save sheet configuration
The system SHALL save the sheet URL, tab name, and column mapping to `chrome.storage.local`.

#### Scenario: Config persistence
- **WHEN** user completes sheet configuration
- **THEN** system saves the config so it can be restored on extension reopen
