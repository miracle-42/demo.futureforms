#! /bin/bash
set -e

# Files to update manually
#  README.md
#  ChangeLog.md

# TODO files:
#  src/openrestdb/pom.xml
#   <version>2.1</version>


NEW=$1

if [[ -z $NEW ]]
then
	echo Error, missing new version number argument.
	echo Example:
	echo \ $0 1.2
	exit 1
fi

sed -i -e "s/^\(\*Release \).*/\1$NEW*/" README.md

#25:console.log("Demo Version 1.2");
sed -i -e "s/\(console.log(\".*Version\) [.0-9]\+\(.\+\)$/\1 $NEW\2/i" src/*/src/index.ts

grep -n '^\*R' README.md
grep -n '^console.log' src/*/src/index.ts
