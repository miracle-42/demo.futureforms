#! /bin/bash
# sudo tcpdump -i lo -A port 9002

# Compact JSON 
# tr -d '\n\t' < x | sed -e 's/\([^a-z0-9]\) \+/\1/gi' -e 's/ \+\([^a-z0-9]\)/\1/gi' -e 's/"/\\"/g'

set -e

if [[ -z $1 ]]
then
  echo Usage:
  echo -e "\t$0 connect <user> <password>"
  echo -e "\t$0 ping"
  echo -e "\t$0 select"
  echo -e "\t$0 insert <country-code> <country-name>"
  echo -e "\t$0 commit"
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
    case "${1}" in
        connect)
            [[ -z $3 ]] && missingArg 3
            URL=$FFHOST/$SESSION/${1}
            echo URL: $URL
            DATA="{\"scope\":\"transaction\",\"auth.method\":\"database\",\"auth.secret\":\"$3\",\"username\":\"$2\"}"
            echo POST: $DATA
            RES=$(curl --silent --data "$DATA" $URL )
            echo Response: $RES
            export SESSION=$(echo $RES | tr , '\n' | grep session | cut -d\" -f4)
            echo export SESSION=$SESSION
            echo $SESSION > $SESSION_FILE
            ;;
        ping)
            URL=$FFHOST/$SESSION/${1}
            echo URL: $URL
            DATA='{"keepalive":true}'
            echo POST: $DATA
            RES=$(\
              curl \
              --silent \
              --data "$DATA" \
              $URL )
            echo Response: "$RES"
            ;;
        select)
            URL=$FFHOST/$SESSION/${1}
            echo URL: $URL
            DATA='{"rows":32,"skip":0,"compact":true,"dateformat":"UTC","describe":false,"sql":"select country_id,country_name from countries order by country_id","bindvalues":[],"cursor":"2"}'
            echo POST: $DATA
            RES=$(\
              curl \
              --silent \
              --data "$DATA" \
              $URL )
            echo Response: "$RES"
            ;;
        insert)
            [[ -z $3 ]] && missingArg 3
            URL=$FFHOST/$SESSION/${1}
            echo URL: $URL
            DATA="{\"sql\":\"insert into countries(country_id,country_name)values(:country_id,:country_name)\",\"dateformat\":\"UTC\",\"bindvalues\":[{\"name\":\"country_id\",\"value\":\"$2\",\"type\":\"string\"},{\"name\":\"country_name\",\"value\":\"$3\",\"type\":\"string\"}]}"
            echo POST: $DATA
            RES=$(\
              curl \
              --silent \
              --data "$DATA" \
              $URL )
            echo Response: "$RES"
            ;;
        commit)
            URL=$FFHOST/$SESSION/${1}
            echo URL: $URL
            RES=$(\
              curl \
              --silent \
              --data "" \
              $URL )
            echo Response: "$RES"
            ;;
        status)
            RES=$(\
              curl \
              --silent \
              --data "" \
              $FFHOST/$SESSION/commit )
            echo Response: "$RES"
            ;;
        *)
          echo "Error: unknown command: $1"
    esac
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
