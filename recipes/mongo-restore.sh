#!/usr/bin/env bash
# Restore a MongoDB database a mongodump fule.

# get current directory https://stackoverflow.com/a/246128
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
source ${DIR}/config.sh

# https://docs.mongodb.com/manual/reference/program/mongodump/

# replace mongo.dump with the path to the file
mongorestore --uri=${MONGO_CONN} --drop --archive=mongo.dump
