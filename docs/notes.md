# Server Setup Notes

- Upgrade system: `sudo apt update && sudo apt upgrade -y`
- Install Python: `sudo apt-get install python python3`
- [Install node](https://github.com/nodesource/distributions#debinstall)
- clone repo
- `cd laundryd && npm install`
- optional: create recipe to set up environment
- create flow file which exports washer array
- `source /home/ubuntu/src/recipes/config.prod.sh && /home/ubuntu/src/bin/run run --config=/home/ubuntu/src/recipes/flow.prod.ts`

# Mongo Setup Notes

- [MongoDB Atlas](https://cloud.mongodb.com/) seems to work well
- Config file on Mac is at `/usr/local/etc/mongod.conf`
- [Install mongodb](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/#install-mongodb-community-edition)
- Need to [set up](https://docs.mongodb.com/manual/reference/configuration-options/index.html#replication-options) [replica sets](https://docs.mongodb.com/manual/tutorial/convert-standalone-to-replica-set/) even on a standalone install
- Configure [external access](https://docs.mongodb.com/manual/reference/configuration-options/#net-options) by removing `bindIp` from the config file and adding `bindIpAll`
- Set up [authentication](https://docs.mongodb.com/manual/tutorial/enable-authentication/) for external access

# Related Projects

- [huginn](https://github.com/huginn/huginn)
- [standard library](https://stdlib.com)
- [fraidycat](https://fraidyc.at)
