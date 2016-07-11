#!/bin/bash
set -e
set -x

{
    echo "# v$(jq .version package.json -r)"
    echo
    git show :CHANGELOG.md
} > CHANGELOG.md
$EDITOR CHANGELOG.md
git add CHANGELOG.md
