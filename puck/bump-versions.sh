#!/bin/bash

# Version bump script for Puck packages
# Usage: ./bump-versions.sh [patch|minor|major|<version>] [--yes]
#   patch|minor|major : bump each package's current version
#   <version>         : set all packages to this exact version (e.g. 1.2.3)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PACKAGES=(
    "packages/puck-types"
    "packages/puck-api"
    "packages/puck-components"
    "packages/puck-theme-manager"
    "packages/puck-content-manager"
    "packages/puck-image-picker"
    "packages/puck-editor"
    "packages/puck-page-manager"
    "packages/puck-renderer"
    "packages/puck-version-history"
)

BUMP_TYPE="${1:-patch}"
AUTO_YES=false
for arg in "$@"; do
    [[ "$arg" == "--yes" || "$arg" == "-y" ]] && AUTO_YES=true
done

# The first arg is either a bump type or an explicit version (e.g. 1.2.3).
EXPLICIT_VERSION=""
if [[ "$BUMP_TYPE" != "patch" && "$BUMP_TYPE" != "minor" && "$BUMP_TYPE" != "major" ]]; then
    if [[ "$BUMP_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-+].+)?$ ]]; then
        EXPLICIT_VERSION="$BUMP_TYPE"
    else
        echo -e "${RED}❌ Invalid bump type or version: $BUMP_TYPE${NC}"
        echo "Usage: $0 [patch|minor|major|<version>] [--yes]"
        exit 1
    fi
fi

bump_version() {
    local version=$1
    local type=$2
    IFS='.' read -r major minor patch <<< "$version"
    case $type in
        major) echo "$((major + 1)).0.0" ;;
        minor) echo "${major}.$((minor + 1)).0" ;;
        patch) echo "${major}.${minor}.$((patch + 1))" ;;
    esac
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -n "$EXPLICIT_VERSION" ]; then
    HEADER_LABEL="set → ${EXPLICIT_VERSION}"
else
    HEADER_LABEL="${BUMP_TYPE}"
fi

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}   Puck Package Version Bump (${HEADER_LABEL})${NC}"
echo -e "${BLUE}===========================================${NC}"

NEW_VERSION_KEYS=()
NEW_VERSION_VALS=()
echo -e "${YELLOW}Planned version bumps:${NC}"
for pkg in "${PACKAGES[@]}"; do
    pkg_json="$pkg/package.json"
    if [ ! -f "$pkg_json" ]; then
        echo -e "${RED}  ❌ $pkg_json not found — skipping${NC}"
        continue
    fi
    current=$(node -p "require('./$pkg_json').version")
    if [ -n "$EXPLICIT_VERSION" ]; then
        new_ver="$EXPLICIT_VERSION"
    else
        new_ver=$(bump_version "$current" "$BUMP_TYPE")
    fi
    NEW_VERSION_KEYS+=("$pkg")
    NEW_VERSION_VALS+=("$new_ver")
    name=$(node -p "require('./$pkg_json').name")
    echo -e "  ${name}: ${YELLOW}${current}${NC} → ${GREEN}${new_ver}${NC}"
done

echo ""
if [ "$AUTO_YES" = false ]; then
    read -p "Apply these version bumps? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Cancelled.${NC}"
        exit 0
    fi
fi

for i in "${!NEW_VERSION_KEYS[@]}"; do
    pkg="${NEW_VERSION_KEYS[$i]}"
    new_ver="${NEW_VERSION_VALS[$i]}"
    pkg_json="$pkg/package.json"
    node -e "
        const fs = require('fs');
        const path = './$pkg_json';
        const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
        pkg.version = '$new_ver';
        fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
    "
    echo -e "${GREEN}  ✅ ${pkg} → ${new_ver}${NC}"
done

echo ""
echo -e "${GREEN}🎉 Version bump complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Review changes: git diff"
echo -e "  2. Commit: git add -A && git commit -m 'chore: bump puck packages ($HEADER_LABEL)'"
echo -e "  3. Publish: ./publish-puck-packages.sh"
