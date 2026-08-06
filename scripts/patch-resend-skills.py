#!/usr/bin/env python3
"""Re-apply local additions to the vendored Resend skill references.

The `resend` skill is installed into `.agents/skills/` (gitignored, pinned by
skills-lock.json), so anything we add there is lost the next time the skill is
reinstalled or updated. The additions themselves live in
docs/vendored-skill-patches/resend/references/ and this script splices them back
in.

Why bother: upstream's automations.md documents step types and connections but
never how a send_email step receives its template variables. Every wrong guess
at that fails silently — the run completes and the email delivers with
"{{event.quiz_score}}" in the subject. See docs/lessons.md 2026-08-06.

Usage:
  python3 scripts/patch-resend-skills.py [--check]

Idempotent: a file already carrying the marker is left alone. --check reports
drift without writing (exit 1 if any patch is missing).
"""
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SKILL = Path.home() / "projects" / "MetaArchitect" / ".agents" / "skills" / "resend" / "references"
PATCHES = REPO / "docs" / "vendored-skill-patches" / "resend" / "references"
MARKER = "verified live 2026-08-06"

# target file -> heading the addition is inserted BEFORE (None = append at end)
ANCHORS = {
    "automations.md": "### Connections",
    "contacts.md": "## Common Mistakes",
    "templates.md": "### Reserved Names",
    "api-keys.md": None,
}


def body(patch_path: Path) -> str:
    """Patch content minus its HTML provenance comment."""
    text = patch_path.read_text()
    if text.lstrip().startswith("<!--"):
        text = text.split("-->", 1)[1].lstrip("\n")
    return text.rstrip() + "\n\n"


def main() -> int:
    check = "--check" in sys.argv
    missing = []

    for name, anchor in ANCHORS.items():
        target, patch = SKILL / name, PATCHES / name
        if not patch.exists():
            print(f"  SKIP {name}: no patch file at {patch}")
            continue
        if not target.exists():
            print(f"  SKIP {name}: skill not installed at {target}")
            continue

        current = target.read_text()
        if MARKER in current:
            print(f"  ok   {name} (already patched)")
            continue

        missing.append(name)
        if check:
            print(f"  MISSING {name}")
            continue

        addition = body(patch)
        if anchor is None:
            target.write_text(current.rstrip() + "\n\n" + addition)
        elif anchor in current:
            target.write_text(current.replace(anchor, addition + anchor, 1))
        else:
            print(f"  WARN {name}: anchor {anchor!r} not found, appending instead")
            target.write_text(current.rstrip() + "\n\n" + addition)
        print(f"  patched {name}")

    if check and missing:
        print(f"\n{len(missing)} patch(es) missing — run without --check to apply.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
