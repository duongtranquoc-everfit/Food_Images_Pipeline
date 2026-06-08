## ADDED Requirements

### Requirement: Persist pipeline state
The system SHALL save the current pipeline stage, sheet configuration, row data, and per-row status to `chrome.storage.local` after each significant action.

#### Scenario: State saved after stage transition
- **WHEN** user advances from one stage to the next
- **THEN** system saves the current stage number and all accumulated data to storage

#### Scenario: State saved after image capture
- **WHEN** an image URL is captured via context menu
- **THEN** system saves the updated row data to storage

### Requirement: Resume on reopen
The system SHALL detect saved state on extension open and offer to resume or start fresh.

#### Scenario: Saved state found
- **WHEN** user opens the extension and saved pipeline state exists
- **THEN** system displays "Continue previous session?" with Resume and Start New options

#### Scenario: No saved state
- **WHEN** user opens the extension with no saved state
- **THEN** system starts at Stage 1

### Requirement: Clear state on completion or new start
The system SHALL clear saved pipeline state when the pipeline completes Stage 5 or when the user starts a new session.

#### Scenario: Pipeline complete
- **WHEN** Stage 5 write-back finishes successfully
- **THEN** system clears saved state from storage

#### Scenario: Start new
- **WHEN** user chooses "Start New" on resume prompt
- **THEN** system clears saved state and starts at Stage 1
