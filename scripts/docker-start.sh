#!/bin/sh
set -e
# اعمال migration های جدید پیش از بالا آمدن سرور (idempotent)
node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma
exec node server.js
