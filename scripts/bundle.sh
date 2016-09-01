#!/bin/bash
set -e
set -x

html=$1
[ -f "$html" ]

js=$(
    grep '<script .*system/boot.js' "$html" |
    grep -o 'data-import="[^"]*"' |
    cut -d '"' -f2
)

js_bundle="${js%.js}-bundle.js"

bundle "$js" > "$js_bundle"

sed \
    -e "/<script .*system\/boot.js/ s~src=\".*\"~src=\"$js_bundle\"~" \
    "$html" \
| html-inline

rm "$js_bundle"
