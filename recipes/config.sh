#!/usr/bin/env bash

# get current directory https://stackoverflow.com/a/246128
export DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

export LAUNDRY_CMD=${DIR}/../bin/run
export LAUNDRY_FOO=BAR
