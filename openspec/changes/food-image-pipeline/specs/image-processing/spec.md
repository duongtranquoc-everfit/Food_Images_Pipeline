## ADDED Requirements

### Requirement: User-configurable output dimensions
The system SHALL allow the user to specify output width and height in pixels before processing begins.

#### Scenario: Dimension config modal
- **WHEN** Stage 3 is entered
- **THEN** system displays a modal with width and height input fields and a confirm button

### Requirement: Resize and composite on white canvas
The system SHALL resize the background-removed subject to fit within the specified dimensions and center it on a white canvas.

#### Scenario: Landscape subject
- **WHEN** a subject wider than tall is processed with target 1000x650
- **THEN** system scales to fit width, centers vertically on white canvas

#### Scenario: Portrait subject
- **WHEN** a subject taller than wide is processed with target 1000x650
- **THEN** system scales to fit height, centers horizontally on white canvas

#### Scenario: No upscale
- **WHEN** the subject is smaller than the target dimensions
- **THEN** system centers it on the white canvas without upscaling

### Requirement: Output format JPG
The system SHALL output processed images as JPEG with quality 90.

#### Scenario: JPG output
- **WHEN** an image is composited on the white canvas
- **THEN** system encodes it as JPEG with quality 0.9

### Requirement: Sequential processing
The system SHALL process images one at a time to manage memory usage.

#### Scenario: Sequential pipeline
- **WHEN** multiple images are queued for processing
- **THEN** system processes them sequentially (fetch → remove bg → resize → encode) with per-image progress updates

### Requirement: Per-image error resilience
The system SHALL continue processing remaining images when one fails.

#### Scenario: Single image failure
- **WHEN** an image fails to fetch or process
- **THEN** system marks it as failed with an error message and continues to the next image
