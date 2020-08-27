#!/bin/bash
set -e
if ! command -v docker-compose &> /dev/null
then
  >&2 echo "Please make sure Docker is installed, with docker-compose in your PATH"
  exit 1
fi
docker-compose up --remove-orphans --build --no-start
echo ==============================
cat .env | grep -v _STATIC # Prints ports for non-static servers
echo ==============================
docker-compose up
