#!/bin/bash
set -e
cd "$(dirname "$0")"
npm run build && rsync -avz --delete dist/ 139.180.156.116:/var/www/teleshop-admin/
