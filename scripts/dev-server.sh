#!/bin/bash
set -e

jq <package.json -r '.devServices[]' | while read service; do
  npx $service &
done

wait
