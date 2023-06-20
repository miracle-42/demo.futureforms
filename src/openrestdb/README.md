# openrestdb

A REST API to connect a Javascript/Typescript application to a PostgreSQL or Oracle database.

![Blocks](img/blocks.png)

## Installation

Unpack the compiled java program [openrestdb.zip](downloads/openrestdb.zip):

`unzip openrestdb.zip`

Configure database brand to use in `conf/config.json`.
Set it to either `postgres` or `oracle`:

```
  {
    "instance" : "dbjs01",
    "database" : "postgres",
```
Configure database port number in `conf/database/postgres.json`:
```
{
  "database":
    {
      "type": "postgres",
      "test": "select user",
      "jdbc": "jdbc:postgresql://localhost:5432/hr?user=[username]&password=[password]&ssl=false"
```
Set credentials:
```
  "pools":
  {
    "proxy":
    {
      ...
      "username": "joe",
      "password": "secret",
      ...
    }
    ,
    "anonymous":
    {
      ...
      "username": "joe",
      "password": "secret",
```
Choose http port numbers to use:

```
  "http":
    {
      "ports":
        {
          "ssl"   : 9001,
          "plain" : 9002,
          "admin" : 9003,
```

Save the file and exit.

## Start openrestdb

Run the script to start openrestdb:

```
bin/openrestdb start
```

On Microsoft Windows run the script `bin\openrestdb.cmd`.

Start a browser and connect to [http://localhost:9002](http://localhost:9002/) .
It will show the text `openrestdb is running`.

## Stop openrestdb

Run the same script for stopping:

```
bin/openrestdb stop
```

## Status

Get the status of the running `openrestdb`:

```
$ bin/openrestdb status

Cores: 12, Waiters: 12, Workers: 96

Memory in MB
----------------------------------------
| id | total     | alloc    | used     |
----------------------------------------
|  0 |       512 |      244 |        8 |
----------------------------------------

Processes
-----------------------------------------------------------------------------
| id |    pid  | type    |  started             |    uptime    |      hits   |
-----------------------------------------------------------------------------
|  0 |  924961 | http    | 15-Feb-2023 13:02:54 |   0 00:02:52 |           2 |
-----------------------------------------------------------------------------
```
