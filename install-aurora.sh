#!/bin/bash

WD=$(pwd)

echo -e "🛠️ Building expense-app-db"
pushd $WD/aurora > /dev/null # dont print to stdout
npm run clean # deletes the old tar file, among other things
npm i # ensure typescript package is installed so build command works
npm run build
popd > /dev/null
# get archive filename without knowing the version number
# (importantly, do this in the original working directory, not in ./aurora)
TARBALL=$(ls $WD/aurora/expense-app-db-*.tgz)
echo -e "✅ Built expense-app-db. Tar file: $TARBALL"

echo "🛠️ Installing expense-app-db into main project"
# install into main project without symlinking
npm i --install-links $TARBALL
echo -e "✅ Installed"

echo -e "🛠️ Installing expense-app-db into lambda dependency layer"
pushd $WD/layers/dependencies/nodejs > /dev/null
npm i --install-links $TARBALL
popd > /dev/null
echo -e "✅ Installed"
