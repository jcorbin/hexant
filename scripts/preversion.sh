#!/bin/bash
set -e
set -x

{
    git changelog v$(jq .version package.json -r)
    echo
    echo -n '#'
    git show HEAD:CHANGELOG.md
} > CHANGELOG.md
git add CHANGELOG.md
