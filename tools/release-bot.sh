#!/bin/bash
# Release bot script for creating release PRs

set -euo pipefail

# Function to detect changed packages
detect_changed_packages() {
    local base_ref="${1:-main}"
    local changed_files=$(git diff --name-only "$base_ref"...HEAD)

    local packages=()

    if echo "$changed_files" | grep -q "^packages/python/pw-ai-foundation/"; then
        packages+=("pw-ai-foundation")
    fi

    if echo "$changed_files" | grep -q "^packages/typescript/chat-core/"; then
        packages+=("@pressw/chat-core")
    fi

    if echo "$changed_files" | grep -q "^packages/typescript/chat-ui/"; then
        packages+=("@pressw/chat-ui")
    fi

    echo "${packages[@]}"
}

# Function to bump version based on conventional commits
bump_version() {
    local package="$1"
    local current_version="$2"
    local commits=$(git log --format="%s" "$BASE_BRANCH"...HEAD)

    local bump_type="patch"

    if echo "$commits" | grep -q "^feat!:\|^fix!:\|^refactor!:\|BREAKING CHANGE"; then
        bump_type="major"
    elif echo "$commits" | grep -q "^feat:"; then
        bump_type="minor"
    fi

    # Use semver tool or implement version bumping logic
    echo "$bump_type"
}

# Function to update package version
update_package_version() {
    local package="$1"
    local new_version="$2"

    case "$package" in
        "pw-ai-foundation")
            sed -i "s/__version__ = \".*\"/__version__ = \"$new_version\"/" \
                packages/python/pw-ai-foundation/src/pw_ai_foundation/__init__.py
            ;;
        "@pressw/chat-core")
            cd packages/typescript/chat-core
            npm version "$new_version" --no-git-tag-version
            cd -
            ;;
        "@pressw/chat-ui")
            cd packages/typescript/chat-ui
            npm version "$new_version" --no-git-tag-version
            cd -
            ;;
    esac
}

# Function to generate changelog entry
generate_changelog() {
    local package="$1"
    local version="$2"
    local date=$(date +%Y-%m-%d)

    echo "## [$version] - $date"
    echo ""

    # Parse conventional commits
    git log --format="%s|%h" "$BASE_BRANCH"...HEAD | while IFS='|' read -r subject hash; do
        case "$subject" in
            feat:*) echo "### Features" ;;
            fix:*) echo "### Bug Fixes" ;;
            docs:*) echo "### Documentation" ;;
            perf:*) echo "### Performance" ;;
            refactor:*) echo "### Refactoring" ;;
            test:*) echo "### Tests" ;;
            chore:*) continue ;;
        esac
        echo "- ${subject#*: } ($hash)"
    done
}

# Main execution
main() {
    local BASE_BRANCH="${1:-main}"
    local RELEASE_BRANCH="release/$(date +%Y%m%d-%H%M%S)"

    # Create release branch
    git checkout -b "$RELEASE_BRANCH"

    # Detect changed packages
    local changed_packages=($(detect_changed_packages "$BASE_BRANCH"))

    if [ ${#changed_packages[@]} -eq 0 ]; then
        echo "No packages have changed"
        exit 0
    fi

    echo "Changed packages: ${changed_packages[*]}"

    # Update versions and generate changelogs
    for package in "${changed_packages[@]}"; do
        echo "Processing $package..."

        # Get current version
        case "$package" in
            "pw-ai-foundation")
                current_version=$(grep -Po '__version__ = "\K[^"]+' \
                    packages/python/pw-ai-foundation/src/pw_ai_foundation/__init__.py)
                ;;
            "@pressw/chat-core")
                current_version=$(jq -r .version packages/typescript/chat-core/package.json)
                ;;
            "@pressw/chat-ui")
                current_version=$(jq -r .version packages/typescript/chat-ui/package.json)
                ;;
        esac

        # Determine version bump
        bump_type=$(bump_version "$package" "$current_version")

        # Calculate new version (simplified - use proper semver tool in production)
        new_version="0.0.2"  # Placeholder

        # Update version
        update_package_version "$package" "$new_version"

        # Generate changelog entry
        changelog=$(generate_changelog "$package" "$new_version")

        # Update CHANGELOG.md for package
        # ... (implementation depends on changelog format)
    done

    # Update lock files
    if [[ " ${changed_packages[@]} " =~ "pw-ai-foundation" ]]; then
        cd packages/python/pw-ai-foundation
        uv pip compile pyproject.toml -o requirements.lock
        cd -
    fi

    if [[ " ${changed_packages[@]} " =~ "@pressw/" ]]; then
        bun install
    fi

    # Commit changes
    git add -A
    git commit -m "chore: prepare release

Packages:
$(printf '%s\n' "${changed_packages[@]}" | sed 's/^/- /')
"

    # Create PR
    gh pr create \
        --title "Release: ${changed_packages[*]}" \
        --body "## Release PR

This PR contains version bumps and changelog updates for the following packages:

$(printf '%s\n' "${changed_packages[@]}" | sed 's/^/- /')

### Checklist
- [ ] Version bumps are correct
- [ ] Changelogs are updated
- [ ] Lock files are updated
- [ ] CI passes
- [ ] Ready to release

**Merging this PR will trigger automatic releases to PyPI/npm**
" \
        --base "$BASE_BRANCH" \
        --label "release"
}

# Run main function
main "$@"
