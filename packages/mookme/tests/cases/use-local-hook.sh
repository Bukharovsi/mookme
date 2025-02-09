#!/bin/bash

TESTS_DIR=$(mktemp -d)

ROOT_FOLDER=$(realpath $(dirname "$0")/../..)
npm run build &> /dev/null

# create and cd in tmp folder
cd $TESTS_DIR

git init
mkdir -p package1

node $ROOT_FOLDER/dist/index.js init \
    --yes \
    --packages package1 \
    --added-behaviour exit \
    --skip-types-selection \
    --packages-path "" > /dev/null

echo '{"steps": [{"name": "Hello world !", "command": "echo 'hello'"}]}' > .hooks/pre-commit.json
echo '{"steps": [{"name": "Hello world ! (local)", "command": "echo 'hello from local' > test.txt"}]}' > .hooks/pre-commit.local.json

echo '{"steps": [{"name": "Hello world !", "command": "echo 'hello'"}]}' > package1/.hooks/pre-commit.json
echo '{"steps": [{"name": "Hello world ! (local)", "command": "echo 'hello from package 1' > test-package.txt"}]}' > package1/.hooks/pre-commit.local.json

git add .
node $ROOT_FOLDER/dist/index.js run -t pre-commit

if [ ! "$(grep -c "\*\*/.hooks/\*.local.json" .gitignore)" -eq 1 ]; then exit 1; fi;
if [ ! "$(grep -c "hello from local" test.txt)" -eq 1 ]; then exit 1; fi;
if [ ! "$(grep -c "hello from package 1" package1/test-package.txt)" -eq 1 ]; then exit 1; fi;