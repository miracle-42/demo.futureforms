# Openrestdb configuration

These paramaters are set in `conf/config.json`.

An example can be found in the template directory
[openrestdb/template/conf/config.json](../src/openrestdb/template/conf/config.json)
.

## instance

Name of instance.

If multiple instances are running on the same server
each instance must have a unique name.

Example:

    "instance": "dbjs01"

## database

Name of database backend configuration file.

The name must refer to the name of the corresponding database configuration file.

Example:

    "database": "postgresql"

In this example a file named `conf/database/postgresql.json` must exist.

## topology

The database server topology can be either:

  * standalone
  * cluster

Example:

    "topology": "standalone"

## sso - timeout

When using Single-Sign-On the timeout for a connection
can be specified.

The SSO is using the `lib/authenticator.jar` library.

Example:

     "timeout": 20

## rest - ses.dump

Example:

    "ses.dump": 300

## rest - ses.timeout

Example:

    "ses.timeout": 60

## rest - sso.timeout

Example:

    "sso.timeout": 20

## rest - files.root

Example:

    "files.root": "./files"

## rest - files.tmpnames

Example:

    "files.tmpnames": false

## security - oauth2 - url

Example:

    "url": "https://oauth2.provider.com:443/token"

## security - oauth2 - headers

Example:

    "headers": {"Authorization": ""}

## security - oauth2 - user.attr

Example:

    "user.attr": "username"

## security - identity - type

Example:

    "type": "pkcs12"

## security - identity - alias

Example:

    "alias": "demo"

## security - identity - keystore

Example:

    "keystore": "./security/demo.p12"

## security - identity - password

Example:

    "password": "Manager1"

## security - trust - type

Example:

    "type": "pkcs12"

## security - trust - keystore

Example:

    "keystore": "./security/trust.p12"

## security - trust - password

Example:

    "password": "Manager1"

## http - Host

Example:

    "Host": null

## http - KeepAlive

Example:

    "KeepAlive": 10

## http - ports - ssl

The `https` port for encrypted communication.

See section `security` for adding a certificate.

Example:

    "ssl": 9001

## http - ports - plain

The `http` port for unencrypted communication.

Example:

    "plain": 9002

The application can then be accessed on http://localhost:9002/ .

## http - ports - admin

Example:

    "admin": 9003

## http - ports - ssl.redirect

Example:

    "ssl.redirect": false

## http - security - Cors-Allow-Domains

When a reverse proxy is used in front of openrestdb
the hostname must be applied to `cors`.

For further information see [Web Proxy](webproxy.md).

Example:

    "Cors-Allow-Domains": "example.com,localhost,127.0.0.1"

## http - deployment - path

Path to the FutureForms application.

Example:

    "path": "./app"

## http - deployment - grace.period

Example:

    "grace.period": 2

## http - virtual-path - endpoint

Default endpoint when no file specified in the path.

Example:

    "endpoint": "/index.html"

# http - handlers

Specific files can be served with different handlers based on path.

Example:

    "class": "openrestdb.handlers.FileHandler", "url" : "/", "methods" :  "GET"},
    "class": "openrestdb.handlers.AppFileHandler", "url" : "/files", "methods" :  "GET, PUT, POST"},
    "class": "openrestdb.handlers.RestHandler", "url" : "/", "methods" :  "POST, PATCH, DELETE, OPTIONS"}

## http - cache

Example:

    {"pattern": "*.js", "maxsize": 1048576},
    {"pattern": "*.html", "maxsize": 1048576}

## http - compression

Files send to the client will be gzip compressed
if the file size is above a certain limit.

Example:

    {"pattern": "*.js", "minsize": 1024},
    {"pattern": "*.html", "minsize": 1024}

## http - mimetypes

File extesion mappings to mimetypes.

Example:

    {"ext": "css", "type": "text/css"},
    {"ext": "txt", "type": "text/plain"},
    {"ext": "text", "type": "text/plain"},
    {"ext": "htm", "type": "text/html"},
    {"ext": "html", "type": "text/html"},
    {"ext": "gif", "type": "image/gif"},
    {"ext": "png", "type": "image/png"},
    {"ext": "jpg", "type": "image/jpeg"},
    {"ext": "jpeg", "type": "image/jpeg"},
    {"ext": "js", "type": "text/javascript"},
    {"ext": "json", "type": "application/json"}

## http - buffers - network

Example:

    "network": 4094

## http - logger - http

Example:

    "http": "info"

## http - logger - rest

Example:

    "rest": "fine"

## http - logger - internal

Example:

    "internal": "info"

## http - logger - files

Example:

    "files": 10

## http - logger - size

Example:

    "size": "1MB"

## http - logger - path

Example:

    "path" : "./logs"
