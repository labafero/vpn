---
name: vpn-plan
description: Use when planning or revisiting work in the VPN monorepo and product requirements, architecture decisions, or official stack documentation must shape the plan.
---

# VPN plan

Produce a short, executable plan grounded in the VPN product and the documented APIs of the stack in use.

## Sources to recover

- Read the repository instructions and `docs/workflows/entrega.md`.
- Read the relevant app PRD, accepted ADRs, and `DESIGN.md` for visual work. Read `docs/operations/environments.md` when an environment or external service is involved.
- Identify the affected app and exact framework/library versions from its `package.json` and `pnpm-lock.yaml`.

## Official stack documentation

Before proposing implementation steps that depend on framework, library, API, or configuration behavior, consult the official documentation for the installed version. Use the framework or vendor's documentation as the primary source; include the supporting links in the plan. Do not substitute memory, repository implementation details, package source, blog posts, or examples from unrelated versions for the documented contract.

Connect the documented API to the actual repository structure and requirements. Inspect project code to locate the change and its local constraints, not to reverse-engineer behavior that the official docs specify.

If the official docs do not establish a viable path, or the documented path conflicts with an accepted ADR or user requirement, state the gap and ask for a decision. Do not silently plan an undocumented workaround or change the architecture.

## Plan shape

Keep the plan proportional to the change. State:

1. Goal and affected apps/packages.
2. The documented approach, with official sources and version relevance.
3. Ordered implementation tasks and observable acceptance criteria.
4. The checks needed for the changed scope, including any environment prerequisites.

Plans are temporary execution aids under `docs/workflows/entrega.md`; do not turn them into durable product requirements. Preserve user authorization boundaries for commits, PRs, deploys, database changes, and other external actions.
