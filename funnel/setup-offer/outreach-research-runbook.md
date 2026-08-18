# Per-firm research runbook — bookkeeper segment test

For the 2026-08 bookkeeper cold-email test (`prospects/bookkeepers-2026-08.csv`).
One pass per firm before the email is written. **Target: 4 minutes of research, 3 minutes
to write.** If a firm eats more than 5 minutes of research, use the fallback opener and
send — a thin email that goes out beats a perfect one that doesn't.

Standard cold-email signal stacks (funding rounds, job postings on LinkedIn, tech-stack
tools, podcast appearances) are built for VC-backed SaaS buyers and are mostly useless
here. A four-person bookkeeping practice in Nanaimo has no press, no funding, and usually
no LinkedIn activity. What it does have is a website that describes its own intake
process. That's the signal source.

---

## The page sweep — in this order

Open the firm's site and hit these. Stop as soon as you have one usable trigger.

| # | Page | What you're looking for |
|---|---|---|
| 1 | **Services** | "Catch-up" / "clean-up" bookkeeping (they take messy files). Bookkeeping *and* personal tax (Jan–Apr crunch). |
| 2 | **How it works / Onboarding / Getting started** | The richest page on any small firm's site. It literally narrates how documents get from client to firm. Quote it back to them. |
| 3 | **Client portal / login link** | Confirm the `pm_tool` call. File-drop only (SmartVault, ShareFile, Hubdoc, Dext, custom upload) = storage without chasing = addressable. A named PM platform = disqualify. |
| 4 | **Team / About** | Real headcount — fills the `staff_estimate` gap. Does the owner still do the books, or supervise? |
| 5 | **Careers / "we're growing"** | Strongest trigger in the segment. See below. |
| 6 | **Contact** | The owner's real name and direct address. Also the compliance check: any "no unsolicited email" language in terms or on the form. |
| 7 | **Google reviews** (2 min, optional) | Clients mention responsiveness and chasing more often than you'd expect. Occasionally hands you the exact complaint. |

---

## The five triggers — ranked

Look for these in order. The first one you find decides the opener. Do not stack two.

**1. Hiring.** A careers page, a "join our team" link, or a job post for an admin,
bookkeeper, or client-services role. This is the best trigger available: they are about
to commit $45–60K/year to work that partly consists of chasing clients. That's the
comparison you want live in their head.

**2. Capacity.** "Not currently accepting new clients," a waitlist, "limited spots,"
or an onboarding freeze. They cannot grow without hiring, which makes the same argument
as #1 with more urgency.

**3. Exposed intake.** An onboarding or how-it-works page that spells out the manual
document flow — "email us your receipts," "drop your files in Dropbox each month,"
"we'll send you a checklist in January." Quote their own words back.

**4. File-drop-only portal.** They bought storage (SmartVault, Dext, Hubdoc, ShareFile)
but nothing that follows up. They've already paid to solve half the problem, which proves
they feel it and proves budget exists.

**5. Dual season.** Bookkeeping plus personal tax, or a T1/T2 page. The Jan–Apr document
scramble is a known, dated, recurring pain you can name without guessing.

**Fallback if none of the five appear:** the service-page specific — name the exact
service they lead with and the document dependency underneath it. Never send a truly
generic email, and never skip a firm because research came up thin.

---

## Disqualify and drop the row

- A named practice-management platform visible anywhere: TaxDome, Karbon, Canopy,
  Financial Cents, Jetpack Workflow, Liscio, Client Hub, Pixie, Ignition, CCH iFirm, Onvio.
- Site is dead, parked, or last updated years ago.
- Franchise or national chain (Padgett, H&R Block, etc.) — no local decision authority.
- Any "we do not accept unsolicited commercial email" language. Note it and drop.

Record the reason in `notes`. A drop is data too.

---

## Capture as you go

Add these columns to the CSV. They're the only way the test produces a readable number.

| column | value |
|---|---|
| `owner_name_verified` | the real name off the contact page — the scraped `owner_name` has junk in it ("Trust Worthy", "Other Pages") |
| `trigger` | `hiring` / `capacity` / `intake` / `filedrop` / `season` / `fallback` |
| `observed` | the one specific line you'll open with, in your words |
| `sent_at` | date |
| `replied` | blank / `yes` / `no` / `bounced` / `optout` |

---

## The rule the whole thing hangs on

The observation has to lead into the problem. If you could delete the personalized
opening and the email still reads fine, the personalization is decoration — an attention
hack, not a reason to reply. "Saw you're hiring a bookkeeper" earns its place because the
next sentence is about what that hire will spend their week doing. "Nice website" doesn't.

Read the opener back and ask: so what? If there's no answer, use a different trigger.
