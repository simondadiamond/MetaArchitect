#!/usr/bin/env bash
# Red-green test harness for the hook guards. Run from anywhere:
#   bash scripts/hooks/test-hooks.sh
# Exit 0 = all gates fire on bad input AND stay silent on good input.
# Also run by skill-lint.sh (check 9) so it re-verifies every Friday.
set -uo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
PASS=0; FAIL=0

# check <name> <script> <payload-json> <expect: deny|ask|inject|allow>
check() {
  local name=$1 script=$2 payload=$3 expect=$4 out decision
  out=$(echo "$payload" | bash "$HERE/$script" 2>&1) || { echo "FAIL $name — script errored: $out"; FAIL=$((FAIL+1)); return; }
  decision="allow"
  grep -q '"permissionDecision": *"deny"' <<<"$out" && decision="deny"
  grep -q '"permissionDecision": *"ask"' <<<"$out" && decision="ask"
  grep -q '"additionalContext"' <<<"$out" && [ "$decision" = "allow" ] && decision="inject"
  if [ "$decision" = "$expect" ]; then
    echo "PASS $name"; PASS=$((PASS+1))
  else
    echo "FAIL $name — expected $expect, got $decision"; FAIL=$((FAIL+1))
  fi
}

bash_payload() { jq -n --arg c "$1" --arg w "${2:-/home/diamond/projects/MetaArchitect}" '{tool_name:"Bash",cwd:$w,tool_input:{command:$c}}'; }
file_payload() { jq -n --arg f "$1" '{tool_name:"Edit",tool_input:{file_path:$f}}'; }
prompt_payload() { jq -n --arg p "$1" '{prompt:$p}'; }

CC=/home/diamond/projects/MetaArchitect/projects/command-center

echo "=== bash-guard.sh ==="
# Rule 1: broad kills — RED
check "pkill -f denied"            bash-guard.sh "$(bash_payload 'pkill -f "next dev"')"                     deny
check "pkill -9 -f denied"         bash-guard.sh "$(bash_payload 'pkill -9 -f node')"                        deny
check "killall node denied"        bash-guard.sh "$(bash_payload 'killall node')"                            deny
check "pkill node denied"          bash-guard.sh "$(bash_payload 'pkill node')"                              deny
# Rule 1 — GREEN
check "kill by pid allowed"        bash-guard.sh "$(bash_payload 'kill 12345')"                              allow
check "fuser -k allowed"           bash-guard.sh "$(bash_payload 'fuser -k 4123/tcp')"                       allow
check "pkill exact name allowed"   bash-guard.sh "$(bash_payload 'pkill my-one-off-script')"                 allow
# Rule 2: force push — RED
check "push --force denied"        bash-guard.sh "$(bash_payload 'git push origin main --force')"            deny
check "push -f denied"             bash-guard.sh "$(bash_payload 'git push -f origin main')"                 deny
check "force-with-lease denied"    bash-guard.sh "$(bash_payload 'git push --force-with-lease origin x')"    deny
# Rule 2 — GREEN
check "normal push allowed"        bash-guard.sh "$(bash_payload 'git push origin ade/branch')"              allow
check "push -u allowed"            bash-guard.sh "$(bash_payload 'git push -u origin feature')"              allow
# Rule 3: --no-verify — RED/GREEN
check "commit --no-verify denied"  bash-guard.sh "$(bash_payload 'git commit -m x --no-verify')"             deny
check "normal commit allowed"      bash-guard.sh "$(bash_payload 'git commit -m "feat: x"')"                 allow
# Rule 4: remote branch deletion — RED/GREEN
check "push --delete denied"       bash-guard.sh "$(bash_payload 'git push origin --delete old-branch')"     deny
check "push :branch denied"        bash-guard.sh "$(bash_payload 'git push origin :old-branch')"             deny
check "refspec push allowed"       bash-guard.sh "$(bash_payload 'git push origin HEAD:main')"               allow
# Rule 5: gh pr merge — RED/GREEN
check "bare gh pr merge denied"    bash-guard.sh "$(bash_payload 'gh pr merge --squash')"                    deny
check "gh pr merge N allowed"      bash-guard.sh "$(bash_payload 'gh pr merge 42 --squash')"                 allow
check "gh pr merge URL allowed"    bash-guard.sh "$(bash_payload 'gh pr merge https://github.com/x/y/pull/42 --squash')" allow
# Rule 6: primary checkout — RED (by cwd and by mention)
check "checkout in primary denied" bash-guard.sh "$(bash_payload 'git checkout feature-x' "$CC")"            deny
check "switch in primary denied"   bash-guard.sh "$(bash_payload 'git switch -c new' "$CC")"                 deny
check "stash in primary denied"    bash-guard.sh "$(bash_payload 'git stash' "$CC/worker")"                  deny
check "git -C primary denied"      bash-guard.sh "$(bash_payload "git -C $CC checkout main~1")"              deny
check "cd primary && commit denied" bash-guard.sh "$(bash_payload "cd $CC && git commit -am x")"             deny
# Rule 6 — GREEN
check "pull in primary allowed"    bash-guard.sh "$(bash_payload 'git pull' "$CC")"                          allow
check "status in primary allowed"  bash-guard.sh "$(bash_payload 'git status' "$CC")"                        allow
check "worktree add from primary"  bash-guard.sh "$(bash_payload "cd $CC && git worktree add ~/.claude-worktrees/x -b y origin/main")" allow
check "checkout in a worktree ok"  bash-guard.sh "$(bash_payload 'git checkout -b fix' "$HOME/.story-worktrees/abc")" allow
check "checkout elsewhere ok"      bash-guard.sh "$(bash_payload 'git checkout -b fix' "/home/diamond/projects/MetaArchitect/.claude/worktrees/x")" allow
# Rule 7: service restart — ask
check "restart service asks"       bash-guard.sh "$(bash_payload 'systemctl --user restart command-center')" ask
check "is-active allowed"          bash-guard.sh "$(bash_payload 'systemctl --user is-active command-center')" allow

echo "=== file-guard.sh ==="
check "edit in primary denied"     file-guard.sh "$(file_payload "$CC/worker/pipeline.ts")"                  deny
check "edit website primary denied" file-guard.sh "$(file_payload '/home/diamond/projects/MetaArchitect/projects/simonparis-website/app/page.tsx')" deny
check "edit in story worktree ok"  file-guard.sh "$(file_payload "$HOME/.story-worktrees/abc/worker/pipeline.ts")" allow
check "edit MetaArchitect ok"      file-guard.sh "$(file_payload '/home/diamond/projects/MetaArchitect/docs/lessons.md')" allow
check "brain INDEX.md denied"      file-guard.sh "$(file_payload '/home/diamond/projects/brain/INDEX.md')"   deny
# file-guard rule 3: agent profiles are propose-only (red-team 2026-07-13)
check "agent profile edit denied"  file-guard.sh "$(file_payload '/home/diamond/projects/MetaArchitect/.claude/agents/sitemaster.md')" deny
check "agent profile in worktree denied" file-guard.sh "$(file_payload '/home/diamond/projects/MetaArchitect/.claude/worktrees/x/.claude/agents/coo.md')" deny
check "skills edit still allowed"  file-guard.sh "$(file_payload '/home/diamond/projects/MetaArchitect/.claude/skills/repurpose/SKILL.md')" allow
check "brain note ok"              file-guard.sh "$(file_payload '/home/diamond/projects/brain/notes/x.md')" allow

# Rule 8 + file-guard rule 3/4: propose-only files (red-team 2026-07-13) — RED
check "sed -i on agent profile denied" bash-guard.sh "$(bash_payload "sed -i s/E04500/FF6600/ .claude/agents/sitemaster.md")" deny
check "sed -i on skill-lint denied"  bash-guard.sh "$(bash_payload "sed -i s/E04500/FF6600/ scripts/skill-lint.sh")"        deny
check "sed -i on brand file denied"  bash-guard.sh "$(bash_payload "sed -i s/x/y/ brand/brand-summary.md")"                 deny
check "redirect into hook denied"    bash-guard.sh "$(bash_payload 'echo x > scripts/hooks/bash-guard.sh')"                 deny
# Rule 8 — GREEN (reading them is fine)
check "grep on agent profile ok"     bash-guard.sh "$(bash_payload 'grep accent .claude/agents/sitemaster.md')"             allow
check "run skill-lint ok"            bash-guard.sh "$(bash_payload 'bash scripts/skill-lint.sh')"                           allow
check "sed -i elsewhere ok"          bash-guard.sh "$(bash_payload 'sed -i s/a/b/ docs/notes.md')"                          allow

echo "=== secrets-guard.sh ==="
check "sbp_ token detected"        secrets-guard.sh "$(prompt_payload 'here is the token sbp_0123456789abcdef0123456789')"  inject
check "ghp_ token detected"        secrets-guard.sh "$(prompt_payload 'use ghp_0123456789abcdef0123456789abcdef')"          inject
check "JWT detected"               secrets-guard.sh "$(prompt_payload 'key: eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZSJ9')" inject
check "password= detected"         secrets-guard.sh "$(prompt_payload 'the password=hunter2 for the box')"                  inject
check "normal prompt silent"       secrets-guard.sh "$(prompt_payload 'fix the nav color on /blog please')"                 allow
check "word password alone silent" secrets-guard.sh "$(prompt_payload 'add a password reset flow to the app')"              allow

echo "=== skill-lint-hook.sh ==="
# Green path only here: a clean repo edit produces no output. (Red path is
# covered by skill-lint's own checks; forcing a FAIL would need a dirty fixture repo.)
check "non-skill edit silent"      skill-lint-hook.sh "$(file_payload '/home/diamond/projects/MetaArchitect/docs/lessons.md')" allow

echo
echo "passed=$PASS failed=$FAIL"
[ "$FAIL" -eq 0 ]
