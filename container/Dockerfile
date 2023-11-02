FROM postgres:16
COPY postgres.conf /etc/postgresql/postgresql.conf
COPY init.sql /docker-entrypoint-initdb.d/
CMD ["-c", "config_file=/etc/postgresql/postgresql.conf"]
