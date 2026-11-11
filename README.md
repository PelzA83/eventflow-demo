# EventFlow Demo

Публичная демонстрационная копия исходного проекта EventFlow.

- **Invitation page:** `index.html`
- **Organizer demo:** `organizer.html`
- **Database source:** `database/`

## Current demo status

The organizer interface currently runs as a static frontend demo. Open `organizer.html` and use demo code `1234`. This is a demonstration gate only, **not authentication**. The dashboard uses hardcoded sample data and does not read or modify real events.

The invitation page is a frontend implementation, but its backend is intentionally **not connected** in this public copy. The Supabase project URL and publishable key from the private working repository were not copied. Connect this page only to a separate DEMO Supabase project after its access rules and test data have been verified.

The SQL files are a snapshot of the current implementation for review and further development. Do not run them against a production database without a separate migration/review process.

## Notes from the copy

- The invitation frontend was aligned with the response shape in `database/03_get_invitation.sql` (`event.date` and `event.time`).
- No Git history from the private working repository was copied.
- No service-role key, password, or live Supabase project configuration is included.
- The sample names in the seed data and organizer screen are fictional demonstration data.

## Project boundaries

This repository is a public development/demo snapshot. It is not the production environment and does not grant access to the private working repository or its Supabase project.

Project context and handoff entry point:
https://pelza83.github.io/eventflow-project-hub/

