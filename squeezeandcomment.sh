#!/bin/sh
file="$1"
cp "$file" "${file}.unsqueezed"
comment="$2"
base="`basename "$file"`"
sed -i -e 's|// .*||; /^$/d' "$file" # Probably safe
sed -i -e 's/throw new[^};]*;\?/;/g' "$file" # Don't waste space on error messages
tr -d '\r\n' < "$file" > ".tmp.${base}" # Not so safe
mv ".tmp.${base}" "$file"
sed -i -e "1i// ${comment}" "$file" # 100% safe
