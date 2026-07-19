# Handoff — Workflow Rescue Launch Kit

status: abandoned
<!-- killed 2026-07-19, Simon's call — do NOT execute -->
goal_id: f7cddc35-304f-44b5-a90e-b50542d31614 (archived)
updated: 2026-07-19

> **KILLED before execution.** Race-to-the-bottom marketplace economics + zero-review cold start,
> and the ghostwriter + setup ventures now fill the side-income slot at 5–10x transaction size.
> Kept as paid-for thinking; revive only if both other ventures stall. Full rationale on the goal.

> Goal: `f7cddc35` (child of Fable 5 Final Week initiative `646c7760`) — the last of the five.
> Written 2026-07-15 by COO session. Intended to be handed to a fresh Fable 5 session verbatim.
> Spec: `docs/superpowers/specs/2026-07-09-workflow-rescue-design.md` — **the source of truth for offer, pricing, scope gates, and firewall rules.** Read it in full before anything else. It is still marked DRAFT pending Simon's review — see Launch Gates.

## Mission

Build everything Workflow Rescue needs to take its first paying customer, so that when Simon clears the launch gates the service goes live the same day. Target economics (spec §5/§7): ≤1.5 Simon-hours per rescue, $2.5–3.5k/mo realistic band at 6 rescues/mo, day-30 and day-90 falsification checkpoints. Your job is the kit; Simon's job is the gates and the go-live click.

**Build everything; publish nothing.** Nothing goes public — no marketplace listing, no community post, no live form that accepts real submissions from strangers — until the Launch Gates below are cleared by Simon.

## Launch Gates (Simon-only — the kit waits behind these)

1. **Employment contract check (autoroot.io):** no moonlighting / IP-assignment / non-compete clause covering automation consulting (spec §8 — "this gates everything").
2. **Spec approval:** the design doc is DRAFT; Simon reviews and approves it (present any open decisions you hit as a short list, not a re-litigation).
3. E&O insurance quote is NOT a gate — spec says get a quote when the first rescue books.

## Deliverables

### 1. Intake form
Per spec §5.1 (Tally or similar — pick the tool that needs no new paid plan): platform (n8n/Make/Zapier only), workflow JSON export upload, error output/screenshots, what changed recently, urgency. Qualifying logic auto-declines out-of-scope (other platforms, new builds, multi-workflow, anything smelling of retainer). Draft the decline messages too — polite, fast, with the re-quote path for "Complex" scope. Keep the form unlisted/test-mode until gates clear.

### 2. Sandbox delivery rig
- A **dedicated rescue n8n instance** on sterling, fully separate from Simon's live n8n (`~/projects/n8n`, bound to Tailscale IP only — do not touch its compose or its data). Separate container + separate data dir + loopback or tailnet-only binding; must be able to import a client's workflow JSON and run it against test payloads.
- Repro harness: import → pin test data → reproduce failure → verify fix. Document the loop.
- Make and Zapier can't self-host: define their diagnose path explicitly (export/blueprint inspection, module-by-module reasoning, client-side verification steps) and be honest in the runbook about the weaker verification story there.

### 3. Rescue runbook + agent tooling
The diagnose → patch → test → report flow (spec §5.2–5.6) as a repeatable runbook or skill, STATE medium-risk compliant: state object per rescue, every step logged, output validated before delivery. Include: scoped-credential rules (prefer client-run changes for production secrets; time-boxed access revoked at delivery), the 7-day fix-verification window terms, and the ≤1.5h Simon-hours budget with actual-hours tracking per rescue (spec self-critique #2 says measure from rescue #1 — build the measurement in).

### 4. Failure report template + taxonomy store
- 1–2 page failure report template: root cause, what changed, what was hardened, recurrence risk. This is the artifact that earns 5-star reviews — make it feel like a $500 document.
- Taxonomy store (spec §6): structured rows per rescue — platform, failure mode, root-cause class, hardening applied. Spec leaves the medium open (JSONL vs Supabase) — decide and note why; keep it OUT of the Meta Architect `pipeline` schema and free of brand vocabulary (firewall). This is the raw material for the $49–79 Automation Failure Handbook at ~15 rescues.

### 5. The rescue drill (proof the kit works)
Before any listing copy is final: deliberately break a realistic n8n workflow in the rescue sandbox (auth expiry, schema drift, silent-fail branch — pick from real-world failure shapes), then run the ENTIRE flow as if it were a paid rescue: intake filled, diagnose, patch, test, report generated, taxonomy row logged, hours recorded. The output doubles as the anonymized **sample report** for the marketplace profile. A kit that hasn't delivered one synthetic rescue end-to-end is not done.

### 6. Marketplace + community assets (ready-to-paste, not posted)
- Upwork Project Catalog listing (productized fixed-price SKUs per spec §2 table, review-builder $200 framing for first 3) + 3–4 proposal templates for "my workflow stopped working" job posts.
- Contra listing (same catalog, secondary).
- Profile copy: "Simon P. — Automation Reliability Engineer." SMB-native language throughout — "your automation broke", never "STATE framework", never "AI Reliability Engineering" (that's the brand's category; spec §3 firewall).
- Community SOP: r/n8n + community.n8n.io answer-drafting workflow, 30 min/wk cap, profile-link-does-the-selling rule.
- Account creation and all posting is Simon's — agents prepare, never publish.

### 7. Ops scaffolding
Day-30 / day-90 checkpoint criteria written into the goal (`f7cddc35`) as dated notes so the weekly-brief can pick them up. Propose (do NOT create — standing rule) any schedule that would help, e.g. a weekly rescue-pipeline check.

## Success criteria

- [ ] Spec read; open decisions (if any) listed for Simon in one short block.
- [ ] Intake form built with auto-decline logic, in test mode; decline/re-quote copy drafted.
- [ ] Rescue sandbox n8n up, isolated from live n8n (live compose untouched — verify with `docker ps` before/after), import→repro→fix loop documented.
- [ ] Runbook/tooling STATE-compliant; hours tracking built in; credential rules + 7-day tail terms written.
- [ ] Taxonomy store decided, created, and holding its first row (from the drill).
- [ ] **Drill complete**: one synthetic rescue end-to-end, sample failure report produced and anonymized for the profile.
- [ ] All listing/profile/proposal/community copy ready-to-paste, zero brand vocabulary, zero cross-links (grep it: "STATE", "Meta Architect", "simonparis.ca", "reliability engineering" must not appear).
- [ ] Nothing published anywhere; Simon handed a one-page go-live checklist (gates → paste listings → enable form → first proposal targets).
- [ ] Goal `f7cddc35` annotated with kit locations; handback notes what was decided where the spec left room.

## Constraints & standing rules

- **Brand firewall is absolute** (spec §3): no mention on LinkedIn, simonparis.ca, or any Meta Architect surface; no links in either direction; SMB positioning language only. If a deliverable needs a home, use a neutral directory (e.g. `projects/workflow-rescue/`) — and keep Meta Architect vocabulary out of client-visible artifacts entirely.
- **Live n8n is production** for Simon's own automations: tailnet-bound by house rule. The rescue sandbox is a separate instance; never modify the existing compose, ports, or data.
- **No retainers, no monitoring, ever** — if you find yourself designing anything with standing responsibility, stop; it's out of scope by design (liability firewall).
- Secrets: never in chat or commits; client-credential handling per spec §2 scope gates.
- Commit completed work proactively; skill-lint if you add/edit skills.
- Sterling memory headroom: the sandbox n8n container adds RAM pressure — check free memory before sizing, keep it lean, and note its footprint in the handback.

## Process

Spec-first: the design thinking is done (spec §1–§10 including its own self-critique) — this is a build task, not a brainstorm. Deliverables 1–4 and 6 parallelize well (subagent per lane); the drill (5) is the integration gate that must run after 1–4 land. Where the spec explicitly left a decision open (taxonomy medium, form tool), decide, note the reasoning, and move — flag to Simon only if a decision is genuinely two-way with real cost. If anything requires spending money (paid form plan, marketplace fees), stop and ask.
