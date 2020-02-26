laundry
=======

data laundering tools

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/laundry.svg)](https://npmjs.org/package/laundry)
[![Downloads/week](https://img.shields.io/npm/dw/laundry.svg)](https://npmjs.org/package/laundry)
[![License](https://img.shields.io/npm/l/laundry.svg)](https://github.com/endquote/laundryd/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g laundry
$ laundry COMMAND
running command...
$ laundry (-v|--version|version)
laundry/0.0.0 darwin-x64 node-v13.8.0
$ laundry --help [COMMAND]
USAGE
  $ laundry COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`laundry commands`](#laundry-commands)
* [`laundry help [COMMAND]`](#laundry-help-command)
* [`laundry run`](#laundry-run)

## `laundry commands`

list all the commands

```
USAGE
  $ laundry commands

OPTIONS
  -h, --help  show CLI help
  -j, --json  output in json format
  --hidden    also show hidden commands
```

_See code: [@oclif/plugin-commands](https://github.com/oclif/plugin-commands/blob/v1.2.3/src/commands/commands.ts)_

## `laundry help [COMMAND]`

display help for laundry

```
USAGE
  $ laundry help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_

## `laundry run`

```
USAGE
  $ laundry run

OPTIONS
  --config=config    (required) path to a javascript file exporting an array of washer settings
  --fileUrl=fileUrl  (required) [default: http://localhost:3000/files] a URL which maps to the file location

  --files=files      (required) [default: (OS cache dir)] where to store downloaded files, either a local path or an
                     s3:// location

  --mongo=mongo      (required) [default: mongodb://localhost:27017/laundry] mongodb connection string

  --port=port        (required) [default: 3000] the port to use for the web server which hosts files and the admin
                     interface

  --retain=retain    the number of days to keep items, or 0 to keep forever, or -1 to not keep at all
```

_See code: [src/commands/run.ts](https://github.com/endquote/laundryd/blob/master/src/commands/run.ts)_
<!-- commandsstop -->
