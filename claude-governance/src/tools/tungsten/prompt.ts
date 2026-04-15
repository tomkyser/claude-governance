export function getPrompt(): string {
  return `# Tungsten \u2014 Persistent Execution Context

Tungsten provides persistent terminal sessions via tmux. A session is established at the start of every work session \u2014 create one as your first action. Once active, all Bash and REPL commands automatically inherit the persistent environment via FS9. Environment variables, working directory, and running processes survive between tool calls.

## Tungsten send vs Bash

Both execute shell commands within the persistent environment. The difference is state modification vs read operations:

**Use Tungsten send to:**
- Modify session state (cd, export, source, nvm use)
- Start long-running processes (dev servers, file watchers, test runners)
- Run interactive REPLs (python3, psql, node, irb, sqlite3)
- Manage concurrent workstreams in named sessions
- Check on background processes (capture)

**Use Bash for:**
- Commands where you need the exit code
- Quick read-only operations (ls, git status, grep)
- Simple file operations that don't modify session state

Both benefit from the persistent context \u2014 Bash inherits the working directory, env vars, and TMUX environment set via Tungsten.

## Session Lifecycle

1. **Start of session:** \`Tungsten({action: "create"})\` \u2014 establish persistent context as your first action
2. **During work:** Use Tungsten send for state changes and long-running processes, Bash for reads and exit codes
3. **End of session:** \`Tungsten({action: "kill"})\` \u2014 clean up resources when done

Sessions are also cleaned up automatically when Claude exits.

## Actions

### send \u2014 Execute a command
Sends a command to the session and captures immediate output.
- Creates session automatically if it doesn't exist
- \`command\` is required
- Returns the command output after a brief delay

### capture \u2014 Read terminal output
Reads the current visible content of the terminal pane.
- Use to check on long-running processes
- \`lines\` controls scrollback depth (default: 50)
- Cheap operation \u2014 use frequently to stay informed

### create \u2014 Create a named session
Explicitly creates a new session. Useful for multiple concurrent workstreams.
- Session name defaults to "main"
- Example: create a "tests" session and a "server" session

### list \u2014 Show all active sessions
Lists all sessions on this socket with window count.

### kill \u2014 End a session
Terminates a session and all its processes.

### interrupt \u2014 Send Ctrl-C
Sends an interrupt signal to stop the current command.
- Useful for stopping runaway processes
- Captures output after the interrupt

## Patterns

### Dev server + tests
\`\`\`
Tungsten({action: "send", command: "npm run dev", session: "server"})
Tungsten({action: "send", command: "npm test -- --watch", session: "tests"})
// Later: check on server
Tungsten({action: "capture", session: "server"})
\`\`\`

### Stateful environment setup
\`\`\`
Tungsten({action: "send", command: "cd /path/to/project && source .env"})
Tungsten({action: "send", command: "echo $DATABASE_URL"})  // persisted!
\`\`\`

### Long build with monitoring
\`\`\`
Tungsten({action: "send", command: "make -j8 all"})
// ... do other work ...
Tungsten({action: "capture", lines: 100})  // check progress
\`\`\`

### Any-language REPL
\`\`\`
Tungsten({action: "send", command: "python3", session: "py"})
Tungsten({action: "send", command: "import pandas as pd; df = pd.read_csv('data.csv')", session: "py"})
Tungsten({action: "send", command: "df.describe()", session: "py"})
// Also works with: psql, node, irb, sqlite3, lua, etc.
\`\`\`

### Multi-session orchestration
\`\`\`
Tungsten({action: "send", command: "npm run dev", session: "server"})
Tungsten({action: "send", command: "npm run worker", session: "worker"})
Tungsten({action: "send", command: "npm test -- --watch", session: "tests"})
// Monitor all:
Tungsten({action: "capture", session: "server"})
Tungsten({action: "capture", session: "worker"})
Tungsten({action: "capture", session: "tests"})
\`\`\`

## Environment Propagation (FS9)
Once any Tungsten session is created, the tmux socket info is written to \`process.env\`. The FS9 binary patch reads this and passes it to bashProvider, which sets \`TMUX\` in the environment for all child processes. This means:
- Bash tool commands inherit the tmux environment automatically
- REPL's \`bash()\` function inherits via the same path
- Spawned agents inherit via \`process.env\`
- State set in Tungsten (env vars, running servers, working directory) is visible to all subsequent tool calls

## Anti-Patterns
- **Don't accumulate sessions.** Kill sessions when done. Each session holds a tmux pane and process tree.
- **Don't capture before sending.** A new session's terminal is empty \u2014 capture immediately after create returns nothing useful.
- **Don't use Tungsten send when you need exit codes.** Tungsten captures output text, not exit status. Use Bash when the exit code matters.
- **Don't skip session creation.** Bash inherits the persistent environment only after a Tungsten session exists. Create one first.

## Notes
- Sessions are isolated per Claude process \u2014 they don't interfere with your tmux sessions
- Sessions are cleaned up automatically when Claude exits
- After Tungsten is used, Bash commands also inherit the tmux environment
- If tmux is not installed, the tool returns an actionable error message
- When a session is active, a panel appears in the TUI showing session state
- Agents spawned during a Tungsten session inherit the tmux environment via process.env`;
}
