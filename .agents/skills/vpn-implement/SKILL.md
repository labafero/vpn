---
name: vpn-implement
description: Use when implementing an authorized change in the VPN monorepo that depends on Nuxt, Vue, Tailwind, Supabase, or another stack API or configuration.
---

# VPN implement

Implement the requested change using the documented behavior of the stack version this app actually installs. The developer's stack knowledge is context, not a reason to skip documentation.

## Before changing code

- Recover the authorized scope and acceptance criteria from the user, approved plan, PR, or relevant product docs. Read repository instructions and `docs/workflows/entrega.md`; consult the affected app PRD, ADRs, and `DESIGN.md` when relevant.
- Identify the affected app/package and exact versions from its `package.json` and `pnpm-lock.yaml`.
- Consult the official framework/library documentation for the installed version before relying on its APIs, configuration, or integration behavior. Prefer the vendor's documentation and release notes. Include the relevant official links when reporting the implementation.

Use repository code to locate the change and preserve local conventions. Do not use source inspection, package internals, memory, or unofficial examples as a substitute for documented public behavior.

## Implement and handle failures

Follow the documented integration path and the accepted product architecture. Keep the change within the user's scope and authorization. Do not add aliases, undocumented APIs, dependency overrides, hidden fallbacks, or alternate architectures merely to get past a typecheck, build, or runtime failure.

When something fails, reproduce it and capture the exact error, affected version, and relevant configuration. Check the official documentation for that API and version, then correct the root cause using the documented behavior. Do not cycle through speculative patches.

If the official documentation does not establish a supported fix, or the documented path cannot satisfy the request, stop the dependent change. Report what failed, what the docs establish, and what remains unknown. Ask the user before implementing a workaround or changing architecture; continue independent authorized work meanwhile.

## Verify and report

Run the repository-required checks for the affected scope and any environment prerequisites specified by its workflow. Report the files/behavior changed, official docs used, commands and results, and any remaining blocker. Do not describe a failed or skipped check as passing.
