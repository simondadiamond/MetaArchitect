# Shared Agents in Command-Center Picker — Design

**Date**: 2026-07-04
**Status**: Approved (Simon, in-session)

## Problem

The command-center new-chat agent picker only lists agents from `<working_dir>/.claude/agents`. The MetaArchitect agents (blog-writer, coo, family, health, sitemaster) live in `~/projects/MetaArchitect/.claude/agents` and are invisible when a chat targets any other folder. Simon wants all of them available in every project/folder, maintained in one place.

## Rejected: per-folder symlinks

Symlinking `.claude/agents` into each of the 7 project folders was the initial idea. Rejected because `command-center` and `simonparis-website` are their own git repos: a committed symlink breaks in story-worker worktrees (which live elsewhere on disk), and gitignoring it needs per-repo edits. A dir-level symlink also blocks folder-local agents, and every new folder needs manual setup.

## Chosen design

Two parts:

### 1. Code change in `command-center/lib/claude/agents.ts` (via story pipeline)

Merge user-level `~/.claude/agents` into agent discovery. All three consumers (`/api/agents` picker, `agentExists` chat-creation validation, `readAgentSystemPrompt` at chat start) go through this one module.

- `listAgents(dir)`: union of `~/.claude/agents` and `<dir>/.claude/agents`; on duplicate agent name, dir-local wins. Alphabetical sort kept.
- `readAgentSystemPrompt(dir, name)`: dir-local first, fall back to `~/.claude/agents/<name>.md`.
- `agentExists`: inherits via `listAgents`.
- Either directory may be missing (treat as empty); entries may be symlinks (follow; skip broken — existing try/catch covers).

### 2. Symlinks into `~/.claude/agents` (in-session, one-time)

`ln -s ~/projects/MetaArchitect/.claude/agents/<name>.md ~/.claude/agents/` for the 5 agents. Files stay versioned in the MetaArchitect repo; edits propagate everywhere. Bonus: Claude Code CLI sessions in any folder see them as user-level agents.

## Success criteria

- `GET /api/agents?dir=<folder without .claude/agents>` returns the user-level agents.
- `GET /api/agents?dir=~/projects/MetaArchitect` returns the union, no duplicate names.
- A chat created in any folder with agent `coo` passes validation and gets coo.md's body (frontmatter stripped) as system prompt.
- Name conflict → dir-local file's description and prompt win.
