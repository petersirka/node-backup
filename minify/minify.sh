ECHO "[COMPILING]"
cd ..
ECHO "....... index.js"
uglifyjs index.js -o minify/node-backup/index.js

cp readme.md minify/node-backup/readme.md
cp package.json minify/node-backup/package.json
cp license.txt minify/node-backup/license.txt
cp bin/backup minify/node-backup/bin/backup
cp bin/restore minify/node-backup/bin/restore

cd minify
node minify.js