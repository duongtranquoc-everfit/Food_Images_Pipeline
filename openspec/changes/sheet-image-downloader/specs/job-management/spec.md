## ADDED Requirements

### Requirement: Job state machine
The system SHALL manage job lifecycle through states: idle, running, paused, stopped, completed.

#### Scenario: State transitions
- **WHEN** a job is created
- **THEN** it starts in "idle" state, transitions to "running" on start, and can transition to "paused", "stopped", or "completed"

#### Scenario: Valid transitions
- **WHEN** the system processes state transitions
- **THEN** it SHALL only allow: idle→running, running→paused, running→stopped, running→completed, paused→running (resume), paused→stopped

### Requirement: Pause job
The system SHALL allow pausing a running job, halting processing after the current file completes.

#### Scenario: Pause during processing
- **WHEN** user clicks pause while job is running
- **THEN** system completes the current file being processed, then pauses before starting the next file

#### Scenario: Resume paused job
- **WHEN** user clicks resume on a paused job
- **THEN** system continues processing from the next unprocessed file, skipping already completed files

### Requirement: Stop job
The system SHALL allow stopping a running or paused job with confirmation.

#### Scenario: Stop confirmation
- **WHEN** user clicks stop on a running or paused job
- **THEN** system shows a confirmation modal asking "Stop current job? Files already saved will remain."

#### Scenario: Stop confirmed
- **WHEN** user confirms stop
- **THEN** system aborts any in-progress fetch (via AbortController), sets job to "stopped" state, and already-saved files remain on disk

#### Scenario: Stop cancelled
- **WHEN** user cancels the stop confirmation
- **THEN** system continues the job in its current state (running or paused)

### Requirement: Per-file progress tracking
The system SHALL track and display the status of each file in the job.

#### Scenario: File statuses
- **WHEN** a job is running
- **THEN** each file shows one of: queued, downloading, resizing, saving, done, failed

#### Scenario: Overall progress
- **WHEN** a job is running
- **THEN** system displays completed count, total count, failed count, and a progress bar

### Requirement: Error resilience
The system SHALL continue processing remaining files when individual files fail.

#### Scenario: Single file failure
- **WHEN** one file fails to download or process
- **THEN** system marks it as "failed" with error details, increments failed count, and continues to the next file

#### Scenario: Job completion with failures
- **WHEN** all files have been processed and some failed
- **THEN** system shows summary "X/Y completed, Z failed" with option to view failed files

### Requirement: New job replaces current
The system SHALL only maintain one job in state. Starting a new job replaces the current one.

#### Scenario: New job when idle/completed/stopped
- **WHEN** user starts a new job and current state is idle, completed, or stopped
- **THEN** system resets state and starts the new job immediately

#### Scenario: New job when running/paused
- **WHEN** user starts a new job while a job is running or paused
- **THEN** system shows confirmation modal "A job is in progress. Stop it and start a new one?"
- **THEN** if confirmed, system stops current job and starts new one
- **THEN** if cancelled, system keeps current job
