#!/bin/bash
set -e
set -x

version=$(jq .version package.json -r)
build="build-v$version"

git checkout -f gh-pages
last_version=$(jq .version package.json -r)
last_build="build-v$last_version"
git reset --hard "$last_build"
git merge --no-edit "v$version"

npm run build

git add --update
git commit --no-edit --amend
git tag -a -m "Build v$version" "$build" HEAD

open index.html

echo
git show --stat

echo
sed -e '/^## /q' CHANGELOG.md
