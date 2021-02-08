# ScsanctionsProject


## Project Dockerization
- `docker-compose up`

## MongoDB Replica Setting
1. npm install run-rs -g

2. Inside back-end project folder, run this command.

    `run-rs -v 4.0.0 --shell`
3. It will start repica servers at 3 different ports.
Inside .env file, replace `MONGO_URI=mongodb://up-to-peak:27017/testdb` with
`MONGO_URI=mongodb://your-pc-name:27017,your-pc-name:27018,your-pc-name:27019/testdb?replicaSet=rs`

4. Open compass and connect to the replica server and import dump files.

5. After that, please run the back-end server. npm start

Note:
You should always run mongodb replica server before starting back-end.

`run-rs --keep`
Once replica server is installed, do not run "run-rs -v 4.0.0 --shell" because it clears db and restart.
