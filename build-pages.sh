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
npm run inline

desc=$(git describe --always $branch)
if [ $(git cat-file -t $desc) == 'tag' ]; then
    desc="build-$desc"
    tagit="$desc"
else
    desc=$(git describe --always HEAD)
fi

sed -e "s/DESCRIBE/$desc/" index-inline-min.html >index.html
git commit -a -m 'gh-pages: update build'
if [ -n "$tagit" ]; then
    git tag -a -m "Build $desc" $tagit HEAD
fi
