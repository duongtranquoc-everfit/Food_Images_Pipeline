## ADDED Requirements

### Requirement: User selects output folder
The system SHALL prompt the user to select an output directory via the File System Access API (`showDirectoryPicker`).

#### Scenario: Folder selection
- **WHEN** user clicks the folder picker button
- **THEN** system opens a native folder picker dialog and stores the selected directory handle

#### Scenario: Folder selection cancelled
- **WHEN** user cancels the folder picker dialog
- **THEN** system does not change the current folder selection and no error is shown

### Requirement: Create output subfolder
The system SHALL create a subfolder named "Images_Single_Ingredient" inside the user-selected directory.

#### Scenario: Subfolder creation
- **WHEN** a job starts and the output folder is selected
- **THEN** system creates "Images_Single_Ingredient" directory inside the selected folder (or uses existing one)

### Requirement: Save images with product name
The system SHALL save each processed image using the product name from the filename column as the file name.

#### Scenario: Normal filename
- **WHEN** a processed image for product "Vitamin C 500mg" is ready to save
- **THEN** system saves it as "Vitamin C 500mg.jpg" in the output subfolder

#### Scenario: Filename with invalid characters
- **WHEN** a product name contains characters invalid for filenames (/, \, :, *, ?, ", <, >, |)
- **THEN** system replaces invalid characters with underscores and saves the file

#### Scenario: Duplicate filename
- **WHEN** two products have the same name
- **THEN** system appends a number suffix (e.g., "Vitamin C 500mg (2).jpg") to avoid overwriting

### Requirement: Real-time file availability
The system SHALL write each image to disk immediately after processing, not batch at the end.

#### Scenario: Incremental save
- **WHEN** each image finishes resize processing
- **THEN** system writes it to the output folder immediately, and the file is visible in the filesystem
