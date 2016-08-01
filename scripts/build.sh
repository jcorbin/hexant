#!/bin/bash
set -e
set -x

desc=$(git describe HEAD)
mess=$(git show HEAD --no-decorate --pretty=oneline | cut -d ' ' -f2-)
src=index-bundle-min.js

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
    src=index-bundle.js
    ;;
esac

sed \
    -e "/data-import/s/src=[^>]*>/src=\"$src\">/" \
    -e "s~BASE~$base~" \
    -e "s/DEV/$desc/" \
    -e "/PROJECT LINK/d" \
    index-dev.html >index-tmp.html

npm run grammar
bundle index.js >index-bundle.js
if [ "$src" == "index-bundle-min.js" ]; then
    minify index-bundle.js >index-bundle-min.js
fi

html-inline -i index-tmp.html -o index.html
rm -f index-tmp.html
