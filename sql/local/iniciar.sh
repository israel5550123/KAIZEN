#!/bin/sh
# Roda uma vez, na primeira subida do Postgres local: cria o usuário kaizen e o esquema kaizen, como na VPS.
set -e
psql -v ON_ERROR_STOP=1 -v senha=kaizen-local --username postgres --dbname kaizen -f /kaizen/criar-usuario-e-esquema.sql
