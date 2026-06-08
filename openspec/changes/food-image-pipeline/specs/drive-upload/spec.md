## ADDED Requirements

### Requirement: Drive folder configuration
The system SHALL accept a Google Drive folder URL and extract the folder ID.

#### Scenario: Valid folder URL
- **WHEN** user enters a Google Drive folder URL
- **THEN** system extracts the folder ID and validates access via Drive API

#### Scenario: Invalid folder URL
- **WHEN** user enters an invalid Drive URL
- **THEN** system displays an error message

### Requirement: Upload processed images
The system SHALL upload each processed image to the specified Drive folder via Drive API multipart upload.

#### Scenario: Successful upload
- **WHEN** a processed image blob is ready
- **THEN** system uploads it to the Drive folder with filename = original food name + ".jpg"

#### Scenario: Duplicate filename
- **WHEN** two or more images have the same food name
- **THEN** system appends a number suffix to subsequent files (e.g., "Chicken Breast (2).jpg") and does NOT overwrite the first

#### Scenario: Upload failure with retry
- **WHEN** an upload fails
- **THEN** system retries once; if still failing, marks the image as failed and continues

### Requirement: Set public sharing
The system SHALL set each uploaded file's sharing permission to "Anyone with the link can view".

#### Scenario: Permission set
- **WHEN** a file is uploaded successfully
- **THEN** system creates a permission with `{ role: "reader", type: "anyone" }` on the file

### Requirement: Collect Drive URLs
The system SHALL collect the view URL for each uploaded file in the format `https://drive.google.com/file/d/{fileId}/view`.

#### Scenario: URL collected
- **WHEN** a file is uploaded and permission is set
- **THEN** system stores the mapping `{ foodName → driveViewUrl }` for the write-back stage

### Requirement: Upload progress
The system SHALL display upload progress (X/Y files uploaded).

#### Scenario: Progress display
- **WHEN** uploads are in progress
- **THEN** side panel shows a progress bar and per-file status
