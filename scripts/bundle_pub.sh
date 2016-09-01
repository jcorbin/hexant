#!/bin/bash
set -e
set -x

file=$1
[ -f "$file" ]

head_ref=$(git symbolic-ref HEAD)
branch=${head_ref##*/}

bundle_sha=$(
    ./scripts/bundle.sh "$file" |
    git hash-object -w --stdin
)

git checkout gh-pages
git cat-file blob "$bundle_sha" > "$file"
git add "$file"
git commit -m "$file: update from branch '$branch'"
