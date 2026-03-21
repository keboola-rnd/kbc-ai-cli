# kbc-app — Keboola Data App CLI

CLI for managing Keboola Data Apps from the terminal. Designed for developers, DevOps, and AI agents.

## Installation

### One-line install (Linux / macOS)

```bash
curl -fsSL https://raw.githubusercontent.com/keboola-rnd/kbc-ai-cli/main/install.sh | bash
```

Auto-detects OS and architecture, downloads the correct binary to `/usr/local/bin/kbc-app`.

### Manual download

Download the binary for your platform from [GitHub Releases](https://github.com/keboola-rnd/kbc-ai-cli/releases/latest):

```bash
# Linux x64
curl -fsSL https://github.com/keboola-rnd/kbc-ai-cli/releases/latest/download/kbc-app-linux-x64 -o /usr/local/bin/kbc-app && chmod +x /usr/local/bin/kbc-app

# Linux ARM64
curl -fsSL https://github.com/keboola-rnd/kbc-ai-cli/releases/latest/download/kbc-app-linux-arm64 -o /usr/local/bin/kbc-app && chmod +x /usr/local/bin/kbc-app

# macOS Intel
curl -fsSL https://github.com/keboola-rnd/kbc-ai-cli/releases/latest/download/kbc-app-darwin-x64 -o /usr/local/bin/kbc-app && chmod +x /usr/local/bin/kbc-app

# macOS Apple Silicon
curl -fsSL https://github.com/keboola-rnd/kbc-ai-cli/releases/latest/download/kbc-app-darwin-arm64 -o /usr/local/bin/kbc-app && chmod +x /usr/local/bin/kbc-app

# Windows x64 — download kbc-app-windows-x64.exe from Releases
```

### From source (requires [Bun](https://bun.sh/))

```bash
git clone https://github.com/keboola-rnd/kbc-ai-cli.git
cd kbc-ai-cli
bun install
bun run src/cli.ts --help
```

## Quick Start

```bash
# Authenticate
kbc-app auth login --stack https://connection.keboola.com --token YOUR_TOKEN

# List apps
kbc-app app list

# Set current app context (no need to pass app-id every time)
kbc-app use <app-id>

# Deploy and follow logs
kbc-app app deploy --follow

# Stream logs
kbc-app app logs --follow
```

For AI agents and CI/CD, use env vars instead of interactive login:

```bash
export KBC_APP_STACK_URL=https://connection.keboola.com
export KBC_APP_TOKEN=xxx
export KBC_APP_ID=12345
kbc-app app deploy --wait
```

## Environment Variables

| Variable | Description |
|---|---|
| `KBC_APP_STACK_URL` | Keboola stack URL |
| `KBC_APP_TOKEN` | Storage API token |
| `KBC_APP_ID` | Default Data App ID |

## Commands

### Authentication
```bash
kbc-app auth login --stack <URL> --token <TOKEN>   # Authenticate
kbc-app auth login --stack <URL> --token <TOKEN> --profile staging  # Named profile
kbc-app auth status                                 # Show current auth
kbc-app auth list                                   # List profiles
```

### App Context
```bash
kbc-app use <app-id>     # Set current app
kbc-app use              # Show current app
```

### App Management
```bash
kbc-app app list                           # List all Data Apps
kbc-app app info [app-id]                  # Detailed app info
kbc-app app deploy [app-id] --wait         # Deploy and wait
kbc-app app deploy [app-id] --follow       # Deploy with log streaming
kbc-app app deploy [app-id] --size medium  # Deploy with size change
kbc-app app stop [app-id]                  # Stop app
kbc-app app start [app-id] --wait          # Start app
kbc-app app open [app-id]                  # Open in browser
kbc-app app delete [app-id] --force        # Delete app
```

### Configuration
```bash
kbc-app config show [app-id]                       # Show full config (JSON)
kbc-app config set [app-id] --size large           # Change backend size
kbc-app config set [app-id] --timeout 3600         # Change auto-suspend
kbc-app config set [app-id] --image-version 1.2.3  # Change runtime version
kbc-app config set [app-id] --slug my-app          # Change URL slug
kbc-app config git [app-id]                        # Show Git settings
kbc-app config git [app-id] --repo <url> --branch main --entrypoint app.py
```

### Secrets
```bash
kbc-app secrets list [app-id]                      # List secrets
kbc-app secrets set [app-id] KEY=VALUE             # Set secret
kbc-app secrets set [app-id] KEY=VALUE --encrypt   # Set encrypted secret
kbc-app secrets set [app-id] A=1 B=2 C=3           # Set multiple
kbc-app secrets delete [app-id] KEY                # Delete secret
kbc-app secrets import [app-id] .env               # Import from .env file
kbc-app secrets import [app-id] .env --encrypt     # Import and encrypt all
```

### Deployment Runs
```bash
kbc-app runs list [app-id]                # List deployment runs
kbc-app runs show [app-id] <run-id>       # Show run details + startup logs
```

### Raw API Access
```bash
kbc-app api data-science GET /apps                             # List all apps
kbc-app api data-science GET /apps/<id>                        # Get app detail
kbc-app api storage GET /branch/default/components             # List components
kbc-app api encryption POST /encrypt --data '"my-secret"'      # Encrypt a value
kbc-app api data-science PATCH /apps/<id> --data '{"desiredState":"stopped"}'
```

## App ID Resolution (Priority)

1. Explicit argument: `kbc-app app info 12345`
2. `use` context: `kbc-app use 12345` then `kbc-app app info`
3. Environment variable: `KBC_APP_ID=12345 kbc-app app info`

## Auth Resolution (Priority)

1. CLI flags: `--stack` and `--token`
2. Environment variables: `KBC_APP_STACK_URL` and `KBC_APP_TOKEN`
3. Config file: `~/.config/kbc-app/config.json`

## Build

```bash
# Build for current platform
bun run build

# Build for all platforms
bun run build:all

# Run compiled binary
./dist/kbc-app --help
```

## Architecture

- **Runtime**: [Bun](https://bun.sh/) — fast JS runtime with native TypeScript support
- **CLI Framework**: [Commander.js](https://github.com/tj/commander.js/)
- **API Client**: Direct HTTP calls to Keboola Storage API + data-science API
- **Config Storage**: `~/.config/kbc-app/config.json`

All commands support `--json` flag for machine-readable output, making it ideal for AI agent consumption.

## AI Agent Skills

This CLI is designed to be used by AI agents for Data App development and management. For comprehensive agent skills and deployment guides, see the [Keboola AI Kit](https://github.com/keboola/ai-kit/tree/main/plugins/dataapp-developer):

- **[Data App Deployment Skill](https://github.com/keboola/ai-kit/blob/main/plugins/dataapp-developer/skills/dataapp-deployment/SKILL.md)** — Complete guide for deploying web apps (Node.js, Python, Streamlit) to Keboola Data Apps. Covers the Docker architecture (`keboola/data-app-python-js` base image), Nginx/Supervisord configuration, secrets-to-env-var mapping, SSE/WebSocket streaming setup, Python dependency management with `uv`, and common error troubleshooting (PEP 668, POST to root, buffered streams).

- **[Data App Development Skill](https://github.com/keboola/ai-kit/blob/main/plugins/dataapp-developer/skills/dataapp-dev/SKILL.md)** — Expert guide for developing Streamlit data apps for Keboola. Covers the validate-build-verify workflow, SQL-first architecture patterns, data validation with Keboola MCP, visual verification with Playwright, and session state management.

## Development

```bash
# Run directly
bun run src/cli.ts app list

# With env vars
KBC_APP_STACK_URL=https://connection.keboola.com KBC_APP_TOKEN=xxx bun run src/cli.ts app list
```

## Release

To create a new release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions automatically builds binaries for all platforms and publishes them as a [GitHub Release](https://github.com/keboola-rnd/kbc-ai-cli/releases).
