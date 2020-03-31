# Server Setup Notes

- Upgrade system: `sudo apt update && sudo apt upgrade -y`
- Install Python: `sudo apt-get install python python3`
- [Install node](https://github.com/nodesource/distributions#debinstall)
- clone repo `git clone git@github.com:endquote/laundryd.git`
- `cd laundryd && npm install`
- optional: create recipe to set up environment
- create flow file which exports washer array

# Mongo Setup Notes

- [Install mongodb](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/#install-mongodb-community-edition)
- Edit config file at `/etc/mongod.conf`
  - [Replication](https://docs.mongodb.com/manual/reference/configuration-options/#replication-options): uncomment `#replication:`, add `replSetName: rs0`
- Enter console: `mongo`
  - `use laundry`
  - `rs.initiate()`
- Set server to auto-launch: `sudo systemctl enable mongod`
- Start server: `sudo systemctl start mongod`

The database URI `"mongodb://localhost:27017/laundry"` should now work, and that's the default.

## Mongo External Access

To access the database from another machine, you'll need to set up [authentication](https://docs.mongodb.com/manual/tutorial/enable-authentication/).

- Edit config file at `/etc/mongod.conf`
  - [Network](https://docs.mongodb.com/manual/reference/configuration-options/#net-options): comment `bindIp`, add `bindIpAll: true`
- Enter console: `mongo`
  - Create admin user:

```
use admin
db.createUser(
  {
    user: "laundry-admin",
    pwd: passwordPrompt(),
    roles: [ { role: "userAdminAnyDatabase", db: "admin" },
             "readWriteAnyDatabase" ]
  }
)
db.auth('laundry-admin', "[password]")
```

- Create laundry database and user:

```
use laundry
db.createUser(
  {
    user: "laundry",
    pwd: passwordPrompt(),
    roles: [ { role: "readWrite", db: "laundry" },
             { role: "read", db: "reporting" } ]
  }
)
quit()
```

- Edit config file at `/etc/mongod.conf`
  - [Security](https://docs.mongodb.com/manual/reference/configuration-options/#security.authorization): Uncomment `#security`, add `authorization: enabled`
- Restart: `sudo systemctl restart mongod`

Now the database URI will be `"mongodb://laundry:[password]@localhost:27017/laundry"`

# Running Laundry

- Run laundry: `source /home/ubuntu/src/recipes/config.prod.sh && /home/ubuntu/src/bin/run run --config=/home/ubuntu/src/recipes/flow.prod.ts`
- Run in background: add `nohup` to the beginning, and `&` to the end
  - `jobs -l` will show the process id, `kill [id]` to stop

# Related Projects

- [huginn](https://github.com/huginn/huginn)
- [standard library](https://stdlib.com)
- [fraidycat](https://fraidyc.at)
