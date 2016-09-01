#!/bin/bash
set -e
set -x

head_ref=$(git symbolic-ref HEAD)
branch=${head_ref##*/}
out=wip_$branch.html

npm run build
wip_sha=$(git hash-object -w "$out")
rm "$out"
git checkout gh-pages
git cat-file blob "$wip_sha" > "$out"
git add "$out"
git commit -m "$out: update from branch '$branch'"
