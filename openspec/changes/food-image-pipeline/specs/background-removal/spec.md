## ADDED Requirements

### Requirement: Remove background from all images
The system SHALL remove the background from every image using `@imgly/background-removal`, regardless of the original background type.

#### Scenario: Successful background removal
- **WHEN** an image is processed
- **THEN** the background is removed, producing a transparent PNG blob of just the food subject

#### Scenario: First-time model download
- **WHEN** the background removal model has not been downloaded yet
- **THEN** system downloads the ONNX model (~40MB) and displays a progress indicator

#### Scenario: Model already cached
- **WHEN** the model was previously downloaded
- **THEN** system uses the cached model without re-downloading

### Requirement: Fallback on removal failure
The system SHALL use the original image if background removal fails for a specific image.

#### Scenario: Removal fails
- **WHEN** background removal throws an error for a specific image
- **THEN** system skips background removal for that image, uses the original, and marks the row with a warning icon

### Requirement: Processing via OffscreenDocument
The system SHALL run background removal in an OffscreenDocument to access WebGL/Web Workers.

#### Scenario: OffscreenDocument lifecycle
- **WHEN** Stage 3 processing begins
- **THEN** system creates an OffscreenDocument (if not already open) and delegates background removal work to it
