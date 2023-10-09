#! /bin/bash
set -e
#set -x

# Files to update manually
#  README.md
#  ChangeLog.md

# TODO files:
#  src/openrestdb/pom.xml
#   <version>2.1</version>


NEW=${1:-$NEWREL}

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

# OpenRestDB
# src/openrestdb/src/main/java/database/Version.java:5:   public static String number = "3.0.1";
sed -i -e "s/\(public static final String number = \"\)[.0-9]\+/\1$NEW/" src/openrestdb/src/main/java/database/Version.java

# Core
# src/core/version.ts:1:const version = "3.16.8";
sed -i -e "s/\(const version = \"\)[.0-9]\+/\1$NEW/" src/core/version.ts

sed -i -e "s/\(- relver: \)[.0-9]\+/\1$NEW/" playbooks/release/release.yml

grep -n '^\*R' README.md
grep -n '^console.log' src/*/src/index.ts
grep -nH $NEW src/openrestdb/src/main/java/database/Version.java src/core/version.ts
