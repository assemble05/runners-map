# 0006. No dependencies

Status: accepted. Date: 2026-11-07.

## Context

The tool reads a PNG, walks a grid and writes a module. A PNG library or an image toolkit would pull in native
builds and a lockfile for a few hundred lines of work, and the owner's other repositories (runners-art) run on
Node alone.

## Decision

- Node 20+ and its built-ins only: `node:zlib` for the PNG, `node:test` for the tests, `node:fs` and
  `node:path` for the tools.
- The PNG codec is ours (`src/image/png.js`): reads non-interlaced images of every color type at bit depths 1 to
  16, writes 8-bit RGBA. Interlaced input is refused with a message that says how to save it.

## Consequences

- `npm install` installs nothing; `package.json` has no `dependencies`. The check runs anywhere Node runs.
- A format the codec does not read (interlaced, APNG) is converted by the user's editor, not by us.
