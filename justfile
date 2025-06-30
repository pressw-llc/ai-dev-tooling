# PressW SDK Development Commands

# Default recipe
default:
    @just --list

# Initialize development environment
init:
    cd packages/python/pw-ai-foundation && uv venv --python 3.11 && source .venv/bin/activate && uv pip install -e ".[dev]" && direnv allow
    bun install

# Run all tests
test:
    cd packages/python/pw-ai-foundation && source .venv/bin/activate && pytest
    bun test

# Lint all code
lint:
    cd packages/python/pw-ai-foundation && source .venv/bin/activate && ruff check . --fix
    bunx eslint . --fix

# Type check all code
typecheck:
    cd packages/python/pw-ai-foundation && source .venv/bin/activate && mypy src
    bun run typecheck

# Format all code
format:
    cd packages/python/pw-ai-foundation && source .venv/bin/activate && ruff format .
    bunx prettier --write .

# Build all packages
build:
    cd packages/python/pw-ai-foundation && source .venv/bin/activate && uv build
    bun run build

# Clean build artifacts
clean:
    rm -rf packages/python/pw-ai-foundation/{dist,build,.venv}
    rm -rf packages/typescript/*/dist
    rm -rf packages/typescript/*/node_modules

# Clean only Python virtual environments
clean-python-venvs:
    rm -rf packages/python/*/.venv

# Initialize a specific Python package (usage: just init-python-package pw-ai-foundation)
init-python-package package:
    cd packages/python/{{package}} && uv venv --python 3.11 && source .venv/bin/activate && uv pip install -e ".[dev]" && direnv allow

# Serve documentation locally
docs-serve:
    cd docs && bun install && bun run start

# Build documentation
docs-build:
    cd docs && bun install && bun run build

# Install pre-commit hooks
install-hooks:
    pre-commit install

# Run pre-commit on all files
pre-commit:
    pre-commit run --all-files
