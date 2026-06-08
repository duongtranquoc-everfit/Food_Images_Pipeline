## ADDED Requirements

### Requirement: Server availability check before processing
The extension SHALL ping `GET /health` on the local server before starting any image processing job. If the server is unreachable or returns non-200, the extension MUST show an error and NOT proceed with processing.

#### Scenario: Server is running
- **WHEN** user starts processing AND `GET /health` returns HTTP 200
- **THEN** extension proceeds with the image processing pipeline

#### Scenario: Server is not running
- **WHEN** user starts processing AND `GET /health` fails (connection refused, timeout)
- **THEN** extension shows error: "Neo server chưa chạy. Chạy lệnh: bun neo-server.ts"
- **AND** processing does NOT start

#### Scenario: Server is degraded
- **WHEN** `GET /health` returns HTTP 503 (e.g., CDP not running)
- **THEN** extension shows the server's error message to the user
- **AND** processing does NOT start

### Requirement: Delegate image processing to local server
The extension SHALL send each image to `POST /process` on the local server with `{ imageUrl, width, height }` and receive the processed image blob in response.

#### Scenario: Successful processing
- **WHEN** server returns HTTP 200 with image binary
- **THEN** extension creates a Blob from the response and continues with Drive upload

#### Scenario: Server returns error
- **WHEN** server returns HTTP 4xx/5xx with error JSON
- **THEN** extension marks the file as failed with the server's error message

#### Scenario: Server connection lost mid-processing
- **WHEN** the HTTP request to `/process` fails due to connection error
- **THEN** extension marks the file as failed with "Server connection lost"

### Requirement: Remove internal processing code
The extension SHALL NOT contain any image processing logic (background removal, resize). All processing is delegated to the local server.

#### Scenario: No content script injection
- **WHEN** extension is loaded
- **THEN** no content scripts are injected into remove.bg tabs

#### Scenario: No REMOVEBG message handlers
- **WHEN** service worker receives messages
- **THEN** there are no handlers for REMOVEBG_REQUEST, REMOVEBG_PROCESS, REMOVEBG_DEBUG, or REMOVEBG_TEST message types
