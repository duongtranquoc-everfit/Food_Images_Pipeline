## ADDED Requirements

### Requirement: Chrome Side Panel
The system SHALL render its UI inside a Chrome Side Panel that persists alongside the active tab.

#### Scenario: Open side panel
- **WHEN** user clicks the extension icon
- **THEN** Chrome opens the side panel with the extension UI

#### Scenario: Panel persists
- **WHEN** user interacts with the web page while the panel is open
- **THEN** the side panel remains open and maintains its state

### Requirement: File upload area
The system SHALL provide a file upload area that accepts CSV and XLSX files via click or drag-and-drop.

#### Scenario: Drag and drop
- **WHEN** user drags a CSV or XLSX file onto the upload area
- **THEN** system accepts the file and begins parsing

#### Scenario: Click to browse
- **WHEN** user clicks the upload area
- **THEN** system opens a native file picker filtered to .csv and .xlsx files

### Requirement: Column mapping controls
The system SHALL display dropdown selectors for choosing the URL column and filename column after file parsing.

#### Scenario: Column dropdowns populated
- **WHEN** a file is successfully parsed
- **THEN** two dropdown selectors appear populated with all column headers from the file

### Requirement: Sheet selector for XLSX
The system SHALL display a sheet selector when an XLSX file with multiple sheets is uploaded.

#### Scenario: Multi-sheet XLSX
- **WHEN** an XLSX file with multiple sheets is parsed
- **THEN** a sheet selector dropdown appears before column mapping, defaulting to the first sheet

### Requirement: Output folder selector
The system SHALL provide a button to select the output folder via File System Access API.

#### Scenario: Select folder
- **WHEN** user clicks the folder selector button
- **THEN** system opens native directory picker and displays the selected folder path

### Requirement: Job progress display
The system SHALL display current job progress with a progress bar, file counts, and per-file status list.

#### Scenario: Progress during job
- **WHEN** a job is running
- **THEN** panel shows: progress bar, "X/Y files (Z failed)", current file being processed, and scrollable list of all files with status icons

### Requirement: Job control buttons
The system SHALL display pause, resume, and stop buttons appropriate to the current job state.

#### Scenario: Running state controls
- **WHEN** job is running
- **THEN** panel shows [Pause] and [Stop] buttons

#### Scenario: Paused state controls
- **WHEN** job is paused
- **THEN** panel shows [Resume] and [Stop] buttons

#### Scenario: Completed/stopped state
- **WHEN** job is completed or stopped
- **THEN** panel shows [New Job] button to reset and start over

### Requirement: Mantine UI framework
The system SHALL use Mantine v7 component library for all UI elements.

#### Scenario: Consistent theming
- **WHEN** the UI renders
- **THEN** all components use Mantine v7 components (Button, Select, Progress, Table, Modal, Dropzone, etc.)
