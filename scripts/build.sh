#!/bin/bash
set -e
set -x

desc=$(git describe HEAD)
mess=$(git show HEAD --no-decorate --pretty=oneline | cut -d ' ' -f2-)

case "$mess" in
Merge\ tag*)
    desc=$(echo $mess | cut -d"'" -f2)
    base=//github.com/jcorbin/hexant/blob/master
    ;;
Merge\ branch*)
    branch=$(echo $mess | cut -d"'" -f2)
    base=//github.com/jcorbin/hexant/blob/$branch
    desc="#$branch $desc"
    ;;
*)
    base=.
    ;;
esac

sed \
    -e "/data-import/s/src=[^>]*>/src=\"index-bundle-min.js\">/" \
    -e "s~BASE~$base~" \
    -e "s/DEV/$desc/" \
    -e "/PROJECT LINK/d" \
    index-dev.html >index-tmp.html

npm run grammar
bundle index.js >index-bundle.js
minify index-bundle.js >index-bundle-min.js

html-inline -i index-tmp.html -o index.html
rm -f index-tmp.html
