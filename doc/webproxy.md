# Web Proxy

In a production environment where FutureForms should be
integrated with other services,
a proxy is useful.
A proxy can be made with Nginx or Apache.

In this example two backends are running with port numbers
9002 and 9012.

If a request goes to `https://example.org/s0`
it will be proxied to the service on port 9002.
Request to `https://example.org/s1` goes to port 9012.

In the `proxy_pass` statement an ending `/` is needed
to strip off the `/s0/` path before it is send to the backend.

Also in Typescript `FormsModule.ts` the `/s0` is added by making the
`Connection()` have the path set with `documentURI`:

    FormsModule.DATABASE = new Connection(document.documentURI.match(/^.*\//)[0]);

`documentURI()` will return `https://example.org/s0/index.html`
and then `match` will strip it to `https://example.org/s0/` 
with a regular expression. 
`[0]` will return the first element in the array from `match`.

In case the backend is not running error code `502 Bad Gateway` will be shown.
In this example a more informative page
`/var/www/html/example.org/errcode/502.html`
is shown.

If there is a reverse proxy in front of Nginx it might be necessary to
add a trailing slash `/` to the path. If the location is `/foo` the file
`/foo/index.html` get's loaded but afterwards `/foo/` should be prefixed so
`/foo/demo.js` get's loaded. The prefix is missing so the browser tries to
load `/demo.js` which does'nt exists. This can be fixed by changing `/foo`
to either `/foo/` or simply `/foo/index.html` which is the file which is
suppoesed to be loaded.

Use this redirect:

    rewrite ^(/[^/]+)$ $1/ permanent;

or

    rewrite ^(/[^/]+)$ $1/index.html permanent;

Here a full Nginx example:

    server {
        listen 443 ssl;
        #listen [::]:443 ssl;
        server_name example.org;
        root /var/www/html/example.org;
        access_log /var/log/nginx/example.org/access.log combined;
        error_log /var/log/nginx/example.org/error.log;
        index index.html;
        gzip on;
        gzip_static on;
    
        ssl_certificate /root/.acme.sh/example.org_ecc/fullchain.cer;
        ssl_certificate_key /root/.acme.sh/example.org_ecc/example.org.key;
    
        error_page 502 /errcode/502.html;
        location /errcode { }
    
        location /s0 {
            rewrite ^(/[^/]+)$ $1/ permanent; # If more than one proxy is used add this rewrite
            proxy_pass http://127.0.0.1:9002/; # Need trailing slash '/'
        }
        location /s1 {
            proxy_pass http://127.0.0.1:9012/;
        }

        location / {
            proxy_pass http://127.0.0.1:9002; # Ending '/' not needed
        }
    }

