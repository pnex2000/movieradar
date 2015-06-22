#!/bin/sh
set -e
dropdb --if-exists movieradar
createdb --template=template0 --locale fi_FI.UTF-8 --encoding UTF-8 movieradar

function execsql {
    local db=$1
    local file=$2
    PGOPTIONS='--client-min-messages=warning' psql -X -q -1 -v ON_ERROR_STOP=1 --pset pager=off -d ${db} -f ${file}
}

execsql movieradar ./db/prepare_db.sql
execsql movieradar ./db/create_db.sql

echo "Done."
