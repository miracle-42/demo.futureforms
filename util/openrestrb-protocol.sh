#! /bin/bash
# sudo tcpdump -i lo -A port 9002

# Compact JSON 
# tr -d '\n\t' < x | sed -e 's/\([^a-z0-9]\) \+/\1/gi' -e 's/ \+\([^a-z0-9]\)/\1/gi' -e 's/"/\\"/g'

# All build in commands
#   egrep -o 'public async.*' src/core/src/database/Connection.ts

set -e

if [[ -z $1 ]]
then
  echo Usage:
  echo -e "\t$0 connect <user> <password>"
  echo -e "\t$0 ping"
  echo -e "\t$0 status"
  echo -e "\t$0 select"
  echo -e "\t$0 release"
  echo -e "\t$0 insert <country-code> <country-name>"
  echo -e "\t$0 commit"
  echo -e "\t$0 disconnect"
  echo
  echo Eaxmple:
  echo -e "\t$0 connect hr hr"
  echo -e "\texport SESSION=0123456789abcdef"
  echo -e "\t$0 select"
  echo -e "\t$0 insert HR Croatia"
  echo -e "\t$0 commit"
  echo
  echo export SESSION=\<session-id\>
  exit 1
fi

if [[ -z $PGPASSWORD ]]
then
    echo Error: Environment variable \$PGPASSWORD is not set for login to the PostgreSQL database.
    echo Execute command:
    echo \ export PGPASSWORD=\<password\>
    exit 2
fi

missingArg ()
{
  echo Error: Missing argument $1
  exit 1
}

FFHOST=${FFHOST:-http://localhost:9002}
SESSION_FILE=$0.session

request ()
{
    command=${1}
    URL=${FFHOST}/${command}

    case "${command}" in
        ping|commit|status|disconnect|release)
            DATA="{\"session\":\"${SESSION}\"}"
            ;;
        connect)
            [[ -z $3 ]] && missingArg 3
            DATA="{\"scope\":\"transaction\",\"auth.method\":\"database\",\"auth.secret\":\"$3\",\"username\":\"$2\"}"
            ;;
        select)
            DATA="{\"session\":\"${SESSION}\",\"rows\":32,\"skip\":0,\"compact\":true,\"dateformat\":\"UTC\",\"describe\":false,\"sql\":\"select country_id,country_name from countries order by country_id\",\"bindvalues\":[],\"cursor\":\"2\"}"
            ;;
        insert)
            [[ -z $3 ]] && missingArg 3
            DATA="{\"session\":\"${SESSION}\",\"sql\":\"insert into countries(country_id,country_name)values(:country_id,:country_name)\",\"dateformat\":\"UTC\",\"bindvalues\":[{\"name\":\"country_id\",\"value\":\"$2\",\"type\":\"string\"},{\"name\":\"country_name\",\"value\":\"$3\",\"type\":\"string\"}]}"
            ;;
        *)
          echo "Error: unknown command: $1"
    esac

    echo Command:
    echo \ curl --silent --data \'$DATA\' $URL
    echo
    RES=$(curl --silent --data "$DATA" $URL)
    echo Response:
    echo "$RES"

    if [[ connect = $command ]]
    then
        export SESSION=$(echo $RES | tr , '\n' | grep session | cut -d\" -f4)
        echo $SESSION > $SESSION_FILE
    else
        touch $SESSION_FILE
    fi

    echo
}

if [[ ! -e $SESSION_FILE ]]
then
    echo Warn sess_file not exists: $SESSION_FILE
    echo
    request connect hr $PGPASSWORD
else
    if [ $(( $(date +%s)-60 )) -gt $(stat -c %Y $SESSION_FILE) ]
    then
        echo WARN too old session_file: $(stat -c %y $SESSION_FILE)
        echo
        request connect hr $PGPASSWORD
    else
        SESSION=$(cat $SESSION_FILE)
    fi
fi

request $@

# vim: tabstop=4 expandtab :
