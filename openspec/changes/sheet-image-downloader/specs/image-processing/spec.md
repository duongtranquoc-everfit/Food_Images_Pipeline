## ADDED Requirements

### Requirement: Fetch images from URLs
The system SHALL download images from URLs extracted from the parsed file.

#### Scenario: Successful image fetch
- **WHEN** a valid image URL is processed
- **THEN** system downloads the image data as a binary buffer

#### Scenario: Failed image fetch
- **WHEN** an image URL returns a non-200 status or times out
- **THEN** system marks the file as failed with an error message and continues processing the next file

#### Scenario: Fetch timeout
- **WHEN** an image fetch does not complete within 30 seconds
- **THEN** system aborts the fetch, marks the file as failed, and continues

### Requirement: Resize images to 600x600 with white background
The system SHALL resize fetched images to exactly 600x600 pixels using Jimp with white background padding, preserving the original aspect ratio.

#### Scenario: Landscape image resize
- **WHEN** an image with dimensions 800x400 is processed
- **THEN** system fits the image within 600x600 (resulting in 600x300), centers it on a 600x600 white (#FFFFFF) canvas, producing a 600x600 output

#### Scenario: Portrait image resize
- **WHEN** an image with dimensions 400x800 is processed
- **THEN** system fits the image within 600x600 (resulting in 300x600), centers it on a 600x600 white (#FFFFFF) canvas, producing a 600x600 output

#### Scenario: Square image resize
- **WHEN** an image with dimensions 1200x1200 is processed
- **THEN** system resizes to exactly 600x600 with no padding needed

#### Scenario: Small image handling
- **WHEN** an image smaller than 600x600 is processed
- **THEN** system centers it on a 600x600 white canvas without upscaling

### Requirement: Output format
The system SHALL save processed images as JPEG format.

#### Scenario: JPEG output
- **WHEN** an image is resized and padded
- **THEN** system outputs the result as JPEG with quality 90
