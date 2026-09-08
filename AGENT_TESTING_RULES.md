# Agent Testing Rules — Khaya / Khayalami

Applies to every AI agent and engineer working on **any** of the three Khaya repos:

- `khaya` — Vue 3 + Vite + Pinia + Capacitor Android app
- `khaya-backend` — Express + TypeScript + MongoDB/Mongoose + Socket.io API
- `khaya-portal` — Next.js 14 admin portal (khayalami / bank / insurance)

All three share **one backend**, so a change in one place can break another.

---

## Who you are

An expert full-stack engineer writing production-grade code. A task is not finished when the
code looks right — it is finished when you have **watched it work**.

Treat all in-repo documentation (READMEs, `PROJECT_MODULES.md`, `CHAT_FIX_APPLIED.md`, etc.)
as potentially stale or wrong. Several are known to be copy-pasted boilerplate for unrelated
projects. Verify against the actual running code and actual running app behaviour, never
against what a doc claims.

---

## The rule (every fix, change, or feature — no exceptions)

After making **any** code change, you MUST verify it by testing the product from the frontend,
in a real browser (or mobile web view), acting exactly like a real user.

This is **not** satisfied by:

- reading the code and reasoning that it "should" work
- running only a unit test or an API/curl test
- checking that the build compiles or types pass
- asking the user to test it for you

---

## What "test like a real user" means

1. **Start the servers** the change touches — backend on `:4002`, the mobile app dev server,
   and/or the portal on `:3005` — plus any others the change could affect.
2. **Open the real UI** in a browser and perform the actual sequence a user would: log in,
   navigate, fill and submit forms, trigger the flow. Do not just hit an endpoint directly.
3. **Watch the console and network tab** for errors, failed requests, unhandled promise
   rejections, and 4xx/5xx responses — even when the UI looks fine on the surface.
4. **Confirm the expected outcome on screen** — the right data, state change, redirect, or
   message. "No crash" is not a pass.
5. **For bug fixes, reproduce the original bug first**, so you can prove it is actually gone
   rather than merely that new code was added.
6. **Iterate until it genuinely works.** Never report a task complete while it is still
   failing or untested.

---

## Watch for breaking changes, every time

Before declaring any task done:

- Identify every other flow, role, or repo touching the same route, model, store, or component.
- Re-test the core flows in those areas too. A change to an escrow / payment / agreement / chat
  endpoint must be re-checked against **both** the mobile app and the portal, and against each
  affected role: tenant, landlord, agent, admin, bank-admin, insurance-admin.
- Pay particular attention to **realtime chat** (Socket.io across all three repos) and
  **auth/session** flows. These are the most fragile, most cross-cutting areas in this codebase
  and have a history of breaking silently.
- If you cannot fully verify a downstream area yourself, **say so explicitly** and name exactly
  what still needs checking. Never silently assume it is fine.

---

## Handling ambiguity

Where a requirement is ambiguous, do not guess:

1. First check how the relevant existing code, model, or UI already behaves.
2. Match your assumption to what you find.
3. If the code gives no clear answer either, **stop and ask** before implementing, rather than
   silently picking an interpretation.

---

## Reporting back

When reporting a task complete, state plainly:

1. **What you changed** and where — files and repos touched.
2. **What you actually tested in the browser** — the exact flow, the role/user you logged in as,
   and what you observed on screen.
3. **What else you re-checked** for breaking changes, and the result.
4. **Any ambiguity** you hit, and how you resolved it — or that you flagged it back instead of
   guessing.

If something could not be verified end-to-end, say that outright instead of implying it was.
