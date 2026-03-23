# Scenarios

The OSS release branch keeps three public scenarios. All of them are browser labs with local verification.

## Kanban

- Scenario id: `kanban-reprioritize-sprint`
- Lab id: `kanban`
- Category: `productivity`

What it exercises:

- reading a structured operator prompt
- rearranging drag-and-drop state in the browser
- verifying exact column membership and card order

How verification works:

- the verifier parses the target board state from the operator prompt
- the live board state is read from the lab
- every card must appear exactly once in the requested column and order

## Paint

- Scenario id: `paint-draw-poster`
- Lab id: `paint`
- Category: `creativity`

What it exercises:

- cursor movement and drawing
- palette selection
- save actions and visual state persistence

How verification works:

- the lab exposes the live canvas grid and the saved draft record
- the verifier compares the saved checksum to the live canvas checksum
- the saved painted-cell count must match the live grid and the result cannot be blank

## Booking

- Scenario id: `booking-complete-reservation`
- Lab id: `booking`
- Category: `commerce`

What it exercises:

- filter selection
- multi-step browsing
- form completion
- booking confirmation

How verification works:

- the operator prompt is parsed into a booking request
- the verifier checks the applied filters in the UI
- the local confirmation record must match the requested hotel, guest, dates, and special request

## Notes On Modes

- `native` mode uses the computer tool directly and is the public default.
- `code` mode uses the browser REPL tool (`exec_js`) to drive the same lab, but the public sample disables it by default because it executes model-generated JavaScript in the runner process.
- Set `CUA_ENABLE_UNSAFE_CODE_TOOL=true` only for isolated local experimentation if you intentionally want to re-enable `code` mode.
- Verification is the same either way because it reads the final lab state, not the agent transcript.
