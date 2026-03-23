# KBC CLI — Makefile
# Targets for code generation, drift checking, and contract validation.

.PHONY: generate check-drift check-workflows check typecheck build

# Re-generate all atomic CLI commands from api-registry.ts
generate:
	bun run generator/generate.ts

# Verify that api-registry.ts matches api-client source (no file output)
check-drift:
	bun run generator/generate.ts --verify-only

# Validate that workflow contracts reference valid atomic methods
check-workflows:
	bun run generator/check-workflows.ts

# Run all checks (drift + workflows + typecheck)
check: check-drift check-workflows typecheck

# TypeScript type checking
typecheck:
	bun run typecheck

# Build binary
build:
	bun run build

# Install dependencies
install:
	bun install
