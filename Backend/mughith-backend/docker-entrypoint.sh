#!/bin/sh
set -e

npx prisma migrate deploy

if [ "${SEED_DATABASE:-true}" = "true" ]; then
  npm run db:seed
fi

exec npm run start:prod
