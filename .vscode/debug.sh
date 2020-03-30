#!/usr/bin/env bash

# https://github.com/Microsoft/vscode/issues/11680#issuecomment-245719597

# load config
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
source ${DIR}/../recipes/config.dev.sh

node $*
