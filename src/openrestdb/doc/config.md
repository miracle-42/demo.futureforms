# Openrestapi configuration

These paramaters is set in `conf/config.json`.

An example can be found in the [template/conf](../template/conf) direcory.

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

---
	"sso":
		"timeout": 20
	"rest":
		"ses.dump": 300,
		"ses.timeout": 60,
		"sso.timeout": 20,
		"files.root": "./files",
		"files.tmpnames": false
	"security":
		"oauth2":
			"url": "https://oauth2.provider.com:443/token"
			"headers":
				{"Authorization": ""}
			"user.attr": "username"
		"identity":
			"type"		: "pkcs12",
			"alias"		: "demo",
			"keystore"	: "./security/demo.p12",
			"password"	: "Manager1"
		"trust":
			"type"		: "pkcs12",
			"keystore"	: "./security/trust.p12",
			"password"	: "Manager1"
	"http":
		"Host": null,
		"KeepAlive": 10
		"ports":
			"ssl"			: 9001,
			"plain"			: 9002,
			"admin"			: 9003,
			"ssl.redirect" 	: false
		"security":
			"Cors-Allow-Domains": "localhost,127.0.0.1"
		"deployment":
			"path": "./app",
			"grace.period" : 2
		"virtual-path":
			"endpoint": "/index.html"
		"handlers": 
			{"class" : "openrestdb.handlers.FileHandler", "url" : "/", "methods" :  "GET"},
			{"class" : "openrestdb.handlers.AppFileHandler", "url" : "/files", "methods" :  "GET, PUT, POST"},
			{"class" : "openrestdb.handlers.RestHandler", "url" : "/", "methods" :  "POST, PATCH, DELETE, OPTIONS"}
		"cache":
			{"pattern": "*.js", "maxsize": 1048576},
			{"pattern": "*.html", "maxsize": 1048576}
		"compression":
			{"pattern": "*.js", "minsize": 1024},
			{"pattern": "*.html", "minsize": 1024}
		"mimetypes":
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
		"buffers":
			"network": 4094		
	"logger":
		"http"		: "info",
		"rest"		: "fine",
		"internal"	: "info",
		"files"	: 10,
		"size"	: "1MB",
		"path" 	: "./logs"
