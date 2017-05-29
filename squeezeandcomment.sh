#!/bin/sh
file="$1"
comment="$2"
base="`basename "$file"`"
sed -i -e '/^$/d;/^\/\//d' "$file" # Probably safe
tr -d '\r\n' < "$file" > ".tmp.${base}" # Not so safe
mv ".tmp.${base}" "$file"
sed -i -e "1i// ${comment}" "$file" # 100% safe
