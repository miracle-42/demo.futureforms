# FutureForms compiled binary

This system is a compiled FutureForms application prepared for production.

If the required software is installed the application can be started with:

    bin/openrestdb start

To get the status run:

    bin/openrestdb status

To stop the application run:

    bin/openrestdb stop

View the log files for debugging.

* logs/control.log.0
* logs/inst00/server.log.0

## Required software

Just two packages are missing:
* Java runtime environment
* A relational database

## Java

The package with Java Runtime Environment (JRE)
is called different on various distributions.

To install java in Ubuntu run

    apt install openjdk-19-jre

To install java on Red Hat run

    dnf install java-17-openjdk

To install java on Windows read the manual.

Other Linux/Unix distribution might use other names
and install method.

## PostgreSQL database

FutureForms can use both Oracle RDBMS and PostgreSQL as the
backend database. Only PostgreSQL is described here.

To install PostgreSQL in Ubuntu run

    apt install postgresql-server

To install PostgreSQL on Red Hat run

    dnf install postgresql-server

To install PostgreSQL on Windows read the manual.

When the database is installed a user and a database
has to be created. After that initial SQL data has
to be loaded.

A user has to be created. In this example the user is called `hr`
and the password is `hr`.

    sudo -u postgres psql -c "CREATE USER hr WITH PASSWORD 'hr'"

A database has to be created. In this example it is called `hr`
and the owner is the previously created `hr`.

    sudo -u postgres psql -c "CREATE DATABASE hr WITH OWNER hr"

If the password is changed it also has to be changed in the
configuration file `conf/database/postgres.json`.

## Configuration

Further information about configuration of openrestdb can be found at
https://github.com/miracle-42/futureforms/blob/main/src/openrestdb/doc/config.md

## Further information

This application is compiled with FutureForms.
For further information go to https://github.com/miracle-42/futureforms

FutureForms library © Miracle 42 A/S https://miracle42.dk/
