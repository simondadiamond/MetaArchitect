# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace

This is a general-purpose Claude Code workspace directory (`C:\Claude`) on Windows 11. It does not currently contain an application codebase.

## Configuration

**`.claude/settings.json`** — Enables the `semgrep@claude-plugins-official` plugin for static analysis.

**`.claude/settings.local.json`** — Grants pre-approved permissions for:
- `claude mcp:*` — MCP server interactions
- `node:*` — Node.js execution
- `powershell.exe:*` — PowerShell commands

## Shell

The environment uses bash (Git Bash / Unix-style syntax) on Windows. Use forward slashes in paths and Unix commands (e.g., `/dev/null` not `NUL`).
