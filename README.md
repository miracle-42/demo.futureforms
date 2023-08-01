# FutureForms

*Release 0.2*

FutureForms is *Javascript only* web sites with database.

FutureForms is a Javascript REST API library.

FutureForms is a Typescript library for fast and easy development of data entry forms and views.

Turn a HTML table into a database view, search and edit form with a few edits.

The primary purpose of FutureForms is to be used for internal applications on the intranet.
To list and edit complex relational data structures for the internal organisation.

Business application vs. Static: FutureForms is primarily made for interactive applications where
you edit & search for data like Google, webmail or games.
Static data like newspapers, Wikipedia & dictionaries is not the primary focus for FutureForms.
Data entry applications is the main focus.

As database backends FutureForms supports both PostgreSQL and Oracle RDBMS.
Build in static read-only list in Javascript is also supported,
when data seldomly changes.

To try out FutureForms go to the
[install section](#install-futureforms-featured-demo-and-tutorial-installation) .

## Stack

A normal Full-stack development consist of a front-end, a backend and a database.
In FutureForms this is cut down to a front-end, a generic backend and a database.

Here the sketch shows the Javascript application running in the client browser
and then sending SQL statements encapsulated in JSON to the `openrestdb` backend.
The `openrestdb` converts the SQL to the appropriate database driver,
sends the request to the database in the native protocol
and sends the result back to the client in JSON format.

![Figure: Building Blocks](img/blocks.svg)

In FutureForms all or mostly all of the business logic
is in the front-end.

Eventually some business logic is written in a
stored procedure in the database.

The backend (web server) is a generic components so none of the
application code is written in here.

![Figure: Compare Business Logic](img/compare-business-logic.svg)

## Security

FutureForms is primarily ment to be used for intranet.
SQL-statements are written in the Javascript application
and then passed through the backend directly to the database.

It is therefore necessary to protect with `GRANT` and other
security technics.

SQL-statments like `DROP` and `CREATE` can be blacklisted in `openrestdb`
but it is recommended to only `GRANT` necessary statements in the database itself.

![Figure: Compare Security](img/compare-security.svg)

`openrestdb` can be configured to reject known keywords like
`CREATE`, `DROP` and `TRUNCATE` but it recommended to handle
the security in the database with `GRANT`.

### Exploits of a Mom

In a standard full-stack setup you have the risk of a SQL-injection.
With FutureForms any SQL-statements are passed through even
the infamous `"Robert'); DROP TABLE Sudents"` so you have
to protect your database for this kind of statements.

![Figure: Exploits of a Mom](img/exploits_of_a_mom.png)

© 2010 [xkcd.com](https://xkcd.com/327/) 

## Documentation

* [Development &amp; release](doc/devrel.md)

## Install FutureForms featured demo and tutorial installation

This Ansible script will install FutureForms with the extended demo.
This demo will show what a lot of the classes in FutureForms can do.

### Requirements

This script will install a lot of TypeScript package
so it is recommended to run the script in a Ubuntu
server running on a virtual machine (VirtualBox, LXC, VmWare, WSL).
This will make a cleanup easier.

In Ubuntu these packages and their dependencies will be installed:

* Java
* PostgreSQL
* npm
* node-typescript
* unzip

Make the installation easier by not requiring password all the time
add `NOPASSWD:` to the group `%sudo`.
Run the command `visudo`:

```
sudo visudo
```

Change the line with `%sudo` to:

```
%sudo   ALL=(ALL:ALL) NOPASSWD:ALL
```

### Install

Start Ubuntu and install Ansible and Git yourself:

```
sudo apt install ansible
```

Now you are ready to install 
[FutureForms Featured Demo](playbooks/demo/)
with the ansible script.

If you want to develop yourself you should start from the tutorial list:

* [0-empty](playbooks/0-empty/) minimal FutureForms template
* [1-login](playbooks/1-login/) simple database login dialog
* [2-countries](playbooks/2-countries/) one table list & edit
* [3-employees](playbooks/3-employees/) one table list & edit with detailed view
* [4-masterdetail](playbooks/4-masterdetail/) two table display
