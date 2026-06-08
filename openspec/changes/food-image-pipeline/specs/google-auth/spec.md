## ADDED Requirements

### Requirement: OAuth2 authentication for Google APIs
The system SHALL authenticate the user via `chrome.identity.getAuthToken()` with OAuth2 scopes for Google Sheets and Google Drive.

#### Scenario: Successful sign-in
- **WHEN** user clicks "Sign in with Google"
- **THEN** system obtains an OAuth token with scopes `spreadsheets` and `drive.file`, and stores authentication state

#### Scenario: Sign-in cancelled
- **WHEN** user cancels the Google sign-in prompt
- **THEN** system displays a message that authentication is required and remains on the sign-in screen

#### Scenario: Token refresh
- **WHEN** an API call returns 401 Unauthorized
- **THEN** system SHALL remove the cached token via `chrome.identity.removeCachedAuthToken()` and re-request a fresh token

### Requirement: Sign-out
The system SHALL allow the user to sign out and clear cached tokens.

#### Scenario: Sign-out
- **WHEN** user clicks "Sign out"
- **THEN** system removes the cached OAuth token and returns to the sign-in screen
