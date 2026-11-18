FROM mysql:8.4

# Exécuté uniquement au 1er démarrage, quand le volume est vide
COPY init.sql /docker-entrypoint-initdb.d/01-init.sql

EXPOSE 3306

HEALTHCHECK --interval=10s --timeout=3s --retries=10 \
  CMD mysqladmin ping -h 127.0.0.1 --silent || exit 1
