"""
Pre-hook to protect .env files from being read/accessed by AI tools.
Reads JSON from stdin (Claude Code hook input), checks if the tool
is trying to access .env files, and blocks if so.

Exit codes:
  0 = allow (tool call proceeds)
  2 = block (tool call is denied, stderr shown to Claude)
"""

import sys
import json
import os
import re


def main():
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            sys.exit(0)

        data = json.loads(raw)
    except (json.JSONDecodeError, Exception):
        # If we can't parse input, allow (don't break the workflow)
        sys.exit(0)

    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    # --- Read tool: check file_path ---
    if tool_name == "Read":
        file_path = tool_input.get("file_path", "")
        if is_env_file(file_path):
            block("BLOCKED: Cannot read .env files - they contain secrets and are protected.")

    # --- Grep tool: check path and glob ---
    elif tool_name == "Grep":
        path = tool_input.get("path", "")
        glob_pattern = tool_input.get("glob", "")
        pattern = tool_input.get("pattern", "")

        if is_env_file(path):
            block("BLOCKED: Cannot search in .env files - they contain secrets and are protected.")

        if glob_pattern and is_env_glob(glob_pattern):
            block("BLOCKED: Cannot search .env files via glob - they contain secrets and are protected.")

        # Block grep patterns that are clearly trying to extract env content
        if pattern and is_env_content_pattern(pattern):
            # Only block if targeting env files specifically
            pass

    # --- Glob tool: check pattern ---
    elif tool_name == "Glob":
        pattern = tool_input.get("pattern", "")
        if pattern and is_env_glob(pattern):
            block("BLOCKED: Cannot glob for .env files - they contain secrets and are protected.")

    # --- Bash tool: check command ---
    elif tool_name == "Bash":
        command = tool_input.get("command", "")
        if is_env_bash_command(command):
            block("BLOCKED: Cannot access .env files via shell commands - they contain secrets and are protected.")

    # --- Edit / Write tools: block editing .env files ---
    elif tool_name in ("Edit", "Write"):
        file_path = tool_input.get("file_path", "")
        if is_env_file(file_path):
            block("BLOCKED: Cannot modify .env files - they contain secrets and are protected.")

    # Allow everything else
    sys.exit(0)


def is_env_file(file_path):
    """Check if a file path points to a .env file."""
    if not file_path:
        return False
    basename = os.path.basename(file_path.replace("\\", "/"))
    # Match .env, .env.local, .env.production, .env.development, etc.
    return bool(re.match(r'^\.env(\..+)?$', basename, re.IGNORECASE))


def is_env_glob(pattern):
    """Check if a glob pattern targets .env files."""
    if not pattern:
        return False
    # Patterns like: .env, .env*, .env.*, **/.env, **/.env.*, *.env
    return bool(re.search(r'(^|[/\\])\.env(\.\*|\*|\.[\w]+)?$', pattern, re.IGNORECASE))


def is_env_content_pattern(pattern):
    """Check if a search pattern is trying to extract env file secrets."""
    # Common patterns for extracting secrets from env files
    secret_patterns = [
        r'(?i)(api[_-]?key|secret|password|token|credential)',
    ]
    return any(re.search(p, pattern) for p in secret_patterns)


def is_env_bash_command(command):
    """Check if a bash command is trying to read .env files."""
    if not command:
        return False
    # Commands that read file contents
    read_cmds = r'(?:cat|head|tail|less|more|type|get-content|gc|bat|nano|vim|vi|code|notepad)'
    # Commands that search file contents
    search_cmds = r'(?:grep|rg|findstr|select-string|awk|sed)'
    # Source/dot commands
    source_cmds = r'(?:source|\.\s)'

    env_file_pattern = r'\.env(?:\.\w+)?(?:\s|$|["\x27|;&>])'

    # Check: <read_cmd> ... .env
    if re.search(rf'(?:^|\s|[;&|])\s*{read_cmds}\s+.*{env_file_pattern}', command, re.IGNORECASE):
        return True
    # Check: <search_cmd> ... .env
    if re.search(rf'(?:^|\s|[;&|])\s*{search_cmds}\s+.*{env_file_pattern}', command, re.IGNORECASE):
        return True
    # Check: source .env or . .env
    if re.search(rf'(?:^|\s|[;&|])\s*{source_cmds}\s+.*{env_file_pattern}', command, re.IGNORECASE):
        return True
    # Check: redirecting .env to stdin (< .env)
    if re.search(rf'<\s*\S*{env_file_pattern}', command, re.IGNORECASE):
        return True

    return False


def block(message):
    """Block the tool call with a message."""
    print(message, file=sys.stderr)
    sys.exit(2)


if __name__ == "__main__":
    main()
