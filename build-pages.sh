#!/bin/bash
set -e
set -x

branch=$1
if [ -z "$branch" ]; then
    branch=$(basename $(git symbolic-ref HEAD))
fi

tagit=

git checkout -f gh-pages
git merge --no-edit $branch

bundle index.js >index-bundle.js
minify index-bundle.js >index-bundle-min.js

desc=$(git describe --always $branch)
if [ $(git cat-file -t $desc) == 'tag' ]; then
    desc="build-$desc"
    tagit="$desc"
else
    desc=$(git describe --always HEAD)
fi

sed \
    -e "/data-import/s/src=[^>]*>/src=\"index-bundle-min.js\">/" \
    -e "s/DEV/$desc/" \
    -e "/PROJECT LINK/d" \
    index-dev.html >index-tmp.html
html-inline -i index-tmp.html -o index.html

git commit -a -m 'gh-pages: update build'
if [ -n "$tagit" ]; then
    git tag -a -m "Build $desc" $tagit HEAD
fi
