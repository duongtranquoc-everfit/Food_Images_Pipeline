## ADDED Requirements

### Requirement: Target column selection
The system SHALL display a dropdown of all columns in the sheet and let the user select which column to write Drive URLs into.

#### Scenario: Column dropdown
- **WHEN** Stage 5 is entered
- **THEN** system shows a dropdown populated with the sheet's header row columns

### Requirement: Batch write by name matching
The system SHALL write Drive URLs to the target column, matching rows by the food name value (not by row index).

#### Scenario: Successful write
- **WHEN** user confirms the target column and clicks "Write URLs"
- **THEN** system matches each uploaded food name to its row in the sheet and writes the Drive URL to the target column

#### Scenario: Name not found in sheet
- **WHEN** a food name from the pipeline does not match any row in the sheet
- **THEN** system logs a warning and skips that entry

### Requirement: Duplicate name handling
The system SHALL match the first occurrence of a duplicate name and log a warning for subsequent duplicates.

#### Scenario: Duplicate names
- **WHEN** the sheet contains duplicate food names
- **THEN** system writes the URL to the first matching row and logs a warning about duplicates

### Requirement: Existing value protection
The system SHALL skip rows where the target column already has a value, unless the user explicitly enables overwrite.

#### Scenario: Skip existing values
- **WHEN** a target cell already contains data and overwrite is not enabled
- **THEN** system skips that row and logs it as "already has value"

#### Scenario: Overwrite enabled
- **WHEN** user enables the overwrite toggle
- **THEN** system writes the Drive URL even if the cell already has a value

### Requirement: Incremental safety
The system SHALL only write to rows that were processed in the current pipeline run, never modifying other rows.

#### Scenario: Partial run
- **WHEN** only 10 out of 50 items were processed and uploaded
- **THEN** system only writes URLs for those 10 items; the other 40 rows remain untouched
