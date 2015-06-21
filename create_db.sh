#!/bin/sh

dropdb --if-exists movieradar
createdb --template=template0 --locale fi_FI.UTF-8 --encoding UTF-8 movieradar

psql movieradar -f ./db/prepare_db.sql
psql movieradar -f ./db/create_db.sql
