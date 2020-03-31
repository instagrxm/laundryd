#!/usr/bin/env bash

# Output a stream of stdout log messages from the laundry service.
sudo journalctl --follow --output=cat -u laundry
