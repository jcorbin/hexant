#!/bin/bash
set -e
set -x

mess=$(git show HEAD --pretty=oneline)
if echo $mess | grep -q 'Merge tag'; then
    desc=$(echo $mess | cut -d"'" -f2)
else
    desc=$(git describe HEAD)
fi

sed \
    -e "/data-import/s/src=[^>]*>/src=\"index-bundle-min.js\">/" \
    -e "s/DEV/$desc/" \
    -e "/PROJECT LINK/d" \
    index-dev.html >index-tmp.html

npm run grammar
bundle index.js >index-bundle.js
minify index-bundle.js >index-bundle-min.js

html-inline -i index-tmp.html -o index.html
rm -f index-tmp.html
