## ADDED Requirements

### Requirement: Parse CSV files
The system SHALL accept CSV file uploads and parse them into structured data (headers + rows).

#### Scenario: Valid CSV upload
- **WHEN** user uploads a .csv file
- **THEN** system extracts the first row as column headers and remaining rows as data

#### Scenario: CSV with various delimiters
- **WHEN** user uploads a CSV with comma, semicolon, or tab delimiters
- **THEN** system auto-detects the delimiter and parses correctly

### Requirement: Parse XLSX files
The system SHALL accept XLSX file uploads and parse them into structured data using SheetJS.

#### Scenario: Valid XLSX upload
- **WHEN** user uploads a .xlsx file
- **THEN** system extracts headers and row data from the active sheet

#### Scenario: XLSX with multiple sheets
- **WHEN** user uploads an XLSX file containing multiple sheets
- **THEN** system SHALL display a sheet selector dropdown and parse the selected sheet

### Requirement: Column detection
The system SHALL extract column headers and present them for user selection.

#### Scenario: Headers extracted
- **WHEN** a file is parsed successfully
- **THEN** system displays all column headers in dropdown selectors for URL column and filename column

### Requirement: Data preview
The system SHALL show a preview of parsed data so the user can verify column mapping.

#### Scenario: Preview table
- **WHEN** a file is parsed and columns are selected
- **THEN** system displays a preview table showing the first few rows with the selected columns highlighted

### Requirement: Reject unsupported file types
The system SHALL only accept .csv and .xlsx files.

#### Scenario: Unsupported file uploaded
- **WHEN** user attempts to upload a file that is not .csv or .xlsx
- **THEN** system displays an error message and does not process the file
