# Instructions for AI coding agents

Before inspecting or changing this repository, read:

1. [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — canonical project state, verified behavior, Supabase context, current file SHAs, known limitations, and next steps.
2. [README.md](README.md) — repository boundaries and quick links.

## Non-negotiable project rules

- Work only in this public demo repository unless the owner explicitly authorizes another target.
- Never modify the private repository PelzA83/EventFlow.
- Do not treat planned work as implemented work. In particular, 10-second dashboard polling is agreed but is not yet in the code.
- Do not expose or request Supabase Service Role Keys, passwords, invitation tokens, or real personal data.
- The organizer code 1234 is a demo-only gate, not authentication.
- Do not weaken RLS or grant direct table access as a shortcut.
- Do not rerun seed SQL against an already populated database.
- Preserve the current static HTML/CSS/JavaScript + GitHub Pages approach unless a different architecture is explicitly approved.
- Before editing a file, fetch its latest contents and use its latest Git blob SHA. Make focused changes and verify the result.
- For dashboard-only work, do not modify index.html.
- Give the project owner one concrete verification step after each small change and wait for the result.

If code and documentation disagree, inspect the current code and live demo, then update the documentation as part of the agreed task. Do not silently assume the documentation or the code is correct.


## Current product priority

The main goal is the fastest practical release of two working prototypes:
1. New Year invitations first.
2. Wedding invitations second, using the shared base and adding wedding-specific personalization and QR behavior.

Use this repository's existing working code as the starting point. For the New Year prototype, implement only what is needed for the complete organizer-to-guest-to-RSVP-to-organizer scenario. Do not build a universal editor or add wedding-only features before they are needed.

The current public demo uses a SharedWorker with in-memory session data. It is a temporary demonstration, not persistent storage and not a production Supabase connection. Do not describe it as persistent. Keep this limitation explicit when proposing or testing changes.

Prioritize work that directly advances the two prototypes. Backend separation, automation, broad audits, and infrastructure improvements are secondary unless a specific blocker or safety risk makes them necessary.

## Change workflow

- Make one focused change at a time.
- After each change, provide one concrete verification step and wait for the owner's confirmation before proceeding.
- Distinguish decisions that are agreed, features that are implemented, and scenarios that have actually been tested.
