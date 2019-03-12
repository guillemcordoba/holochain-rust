#!/usr/bin/env bash

if [[ "$OSTYPE" == "linux-gnu" ]];
then
 . `pwd`/scripts/install/linux.sh
elif [[ "$OSTYPE" == darwin* ]];
then
 . `pwd`/scripts/install/osx.sh
else
 echo "auto install script not supported on $OSTYPE";
 exit 0;
fi
