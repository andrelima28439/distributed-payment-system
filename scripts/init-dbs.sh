#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    CREATE DATABASE fraud_detection;
    CREATE DATABASE reconciliation;
    CREATE DATABASE notifications;
EOSQL
