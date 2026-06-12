#!/bin/bash
set -e
npm run build
rsync -av --delete dist/ root@139.180.156.116:/var/www/teleshop-admin/
echo "✅ Deployed to VPS!"
echo "Now push to GitHub for backup: git push"
