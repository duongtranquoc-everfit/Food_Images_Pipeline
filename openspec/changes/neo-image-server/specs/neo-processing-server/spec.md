## ADDED Requirements

### Requirement: Health check endpoint
The server SHALL expose `GET /health` that returns HTTP 200 with `{ "status": "ok", "neo": true, "cdp": true }` when all dependencies are available.

#### Scenario: All dependencies available
- **WHEN** Neo CLI exists at configured path AND Chrome CDP is reachable
- **THEN** server returns HTTP 200 with `{ "status": "ok", "neo": true, "cdp": true }`

#### Scenario: CDP not running
- **WHEN** Chrome CDP is not reachable on the configured port
- **THEN** server returns HTTP 503 with `{ "status": "error", "neo": true, "cdp": false, "message": "Chrome CDP not running. Run: neo start" }`

### Requirement: Process image endpoint
The server SHALL expose `POST /process` that accepts `{ imageUrl: string, width: number, height: number }` and returns the processed image as `image/png` binary response.

#### Scenario: Successful processing
- **WHEN** a valid image URL, width, and height are provided
- **THEN** server fetches the image, removes background via Neo + remove.bg, resizes onto a white canvas of the specified dimensions, and returns HTTP 200 with `Content-Type: image/png`

#### Scenario: Invalid request body
- **WHEN** request body is missing `imageUrl`, `width`, or `height`
- **THEN** server returns HTTP 400 with `{ "error": "Missing required fields: imageUrl, width, height" }`

#### Scenario: Image fetch fails
- **WHEN** the image URL is unreachable or returns non-image content
- **THEN** server returns HTTP 422 with `{ "error": "Failed to fetch image: <reason>" }`

#### Scenario: Background removal fails
- **WHEN** Neo/remove.bg fails to process the image (timeout, DOM change, etc.)
- **THEN** server returns HTTP 422 with `{ "error": "Background removal failed: <reason>" }`

### Requirement: Neo remove.bg automation
The server SHALL use Neo CLI to automate remove.bg: open/reuse a tab at `https://www.remove.bg/upload`, inject the image via file input or dropzone, wait for Konva.js canvas result, and capture the background-removed canvas.

#### Scenario: Detect correct result canvas
- **WHEN** remove.bg has finished processing and multiple Konva.js canvas layers exist
- **THEN** server identifies the result canvas by finding one with transparent corner pixels (alpha=0) and opaque center pixels (alpha>0)

#### Scenario: Tab reuse
- **WHEN** a remove.bg tab is already open from a previous request
- **THEN** server navigates to `/upload` on the existing tab instead of opening a new one

### Requirement: Image resize with white canvas
The server SHALL resize the background-removed image onto a white canvas of the target dimensions: detect object bounds via alpha channel, scale to fit (no upscale), center on white background, output as PNG.

#### Scenario: Image smaller than target
- **WHEN** the food object fits within target dimensions without scaling
- **THEN** server centers it on the white canvas at original size

#### Scenario: Image larger than target
- **WHEN** the food object exceeds target dimensions
- **THEN** server scales it down proportionally to fit, then centers on white canvas

### Requirement: Auto-start Chrome CDP
The server SHALL attempt to start Chrome with CDP via `neo start` on server startup if CDP is not already running.

#### Scenario: CDP not running at startup
- **WHEN** server starts and Chrome CDP is not reachable
- **THEN** server runs `neo start` and waits up to 10 seconds for CDP to become available

#### Scenario: CDP already running
- **WHEN** server starts and Chrome CDP is already reachable
- **THEN** server connects to existing CDP session without launching a new Chrome instance
