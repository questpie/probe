---
"@questpie/probe": patch
---

Fix child process dying after ready detection — pipe stdout/stderr to log file instead of destroying streams (prevents SIGPIPE kill on macOS)
