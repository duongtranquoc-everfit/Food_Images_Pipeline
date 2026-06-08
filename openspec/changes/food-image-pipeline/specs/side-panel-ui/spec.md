## ADDED Requirements

### Requirement: Dual mode tabs
The system SHALL display two mode tabs at the top of the side panel: "Google Sheets Pipeline" and "Local CSV/XLSX".

#### Scenario: Mode switching
- **WHEN** user clicks on a mode tab
- **THEN** the side panel displays the corresponding mode's UI

### Requirement: Pipeline stage navigation
The system SHALL display a stage indicator showing the current stage (1-5) with labels, and allow navigating back to completed stages.

#### Scenario: Stage indicator
- **WHEN** the pipeline is at Stage 3
- **THEN** stages 1-2 show as completed (clickable to review), stage 3 is active, stages 4-5 are locked

#### Scenario: Navigate back
- **WHEN** user clicks on a completed stage
- **THEN** system displays that stage's UI for review, with a button to return to the current stage

### Requirement: Stage 1 UI — Sheet Connection
The system SHALL display inputs for Google Sheet URL, tab selector, and column mapping dropdowns.

#### Scenario: Stage 1 form
- **WHEN** Stage 1 is active
- **THEN** UI shows: Google sign-in button (if not authenticated), Sheet URL input, tab dropdown, name column dropdown, image URL column dropdown, and "Load Data" button

### Requirement: Stage 2 UI — Image Selection
The system SHALL display the image selection table with active row highlighting and a "Done & Next Step" button.

#### Scenario: Stage 2 layout
- **WHEN** Stage 2 is active
- **THEN** UI shows: scrollable table (row #, name, image URL/status), active row highlighted in blue, "Done & Next Step" button

### Requirement: Stage 3 UI — Image Processing
The system SHALL display a dimension config modal before processing, then a progress view during processing.

#### Scenario: Stage 3 config
- **WHEN** Stage 3 is entered
- **THEN** UI shows modal with width/height inputs and "Start Processing" button

#### Scenario: Stage 3 progress
- **WHEN** processing is running
- **THEN** UI shows progress bar, current file name, per-file status list, and pause/stop controls

### Requirement: Stage 4 UI — Drive Upload
The system SHALL display a Drive folder URL input and upload progress.

#### Scenario: Stage 4 config
- **WHEN** Stage 4 is entered
- **THEN** UI shows Drive folder URL input and "Start Upload" button

#### Scenario: Stage 4 progress
- **WHEN** uploads are running
- **THEN** UI shows progress bar and per-file upload status

### Requirement: Stage 5 UI — Sheet Write-back
The system SHALL display a target column selector, overwrite toggle, and write confirmation.

#### Scenario: Stage 5 form
- **WHEN** Stage 5 is entered
- **THEN** UI shows target column dropdown, overwrite toggle (default off), and "Write URLs" button

#### Scenario: Stage 5 complete
- **WHEN** write-back completes
- **THEN** UI shows summary (X written, Y skipped, Z warnings) and "Done" button
