# OpenRestDb runtime

Openrestdb is a REST- and Web-service running on a server.

# Commands

The script `bin/openrestdb` has the following commands:

* start
* stop
* status
* deploy

## Start

To start the web service run:

    bin/openrestdb start

## Stop

To stop the web service run:

    bin/openrestdb stop

## Status

To get the status of the web service run:

    bin/openrestdb status

Example output:

    Instance: dbjs01, SSL: 9001, Plain: 9002, Admin: 9003
    
    Cores: 16, Waiters: 16, Workers: 128
    
    Memory in MB
    ----------------------------------------
    | id | total     | alloc    | used     |
    ----------------------------------------
    |  0 |       512 |      512 |       18 |
    ----------------------------------------
    
    Processes
    ------------------------------------------------------------------------------
    | id |    pid  | type    |  started             |    uptime    |      hits   |
    ------------------------------------------------------------------------------
    |  0 | 1823023 | http    | 18-Jul-2023 10:41:58 |   0 00:00:38 |           6 |
    ------------------------------------------------------------------------------

## Deploy

Deploy a new version of the application without downtime by running the command:

    bin/openrestdb deploy

The deployment will copy a set of files from directory `app` or
actually the `path` specified in `conf/config.json`.

# Directory layout

* **app** -
  End user application.
  HTML, JPEG and JS files.
  This is the default directory `path` specified
  `conf/config.json'.
* **bin** -
  OS scripts for starting and stopping OpenRestDb.
* **conf** -
  Configuration files for OpenRestDb itself and the
  specific database used, e.g. PostgreSQL and Oracle.
* **data** -
  Sample SQL-data.
* **ipc** -
  Interprocess communication used for cluster configuration.
* **lib** -
  Jar-files for OpenRestDb, database drivers and utilities.
* **logs** -
  Log files for debug.
  `inst00/server.log.0` is the main logfile for the instance.
  `control.log.0` is the preliminary logfile before the
  configuration file is read.
* **security** -
  TSL/SSL certificates.
* **tmp** -
  A copy of `app` for each instance is placed here.
