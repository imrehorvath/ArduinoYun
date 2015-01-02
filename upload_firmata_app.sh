#!/bin/sh
# Copyright (C) 2015 imi.horvath@gmail.com

[ "$1" == "-h" -o "$1" == "--help" -o "$1" == "" -o "$#" -ne 1 ] && {
  cat >&2 <<HELPTEXT

Usage: `basename $0` <file>

Please provide a Frimata app file as parameter to be uploaded to your Yun.
It is assumed that the Yun can be accessed under the name "arduino.local"
with ssh.

It is also assumed, that the file is a node.js application using the
firmata module.

Example: `basename $0` blink.js

HELPTEXT
  exit 1
}

[ -f "$1" ] || {
  echo "File \"$1\" not found." >&2
  exit 1
}

cat "$1" | ssh root@arduino.local \
'(echo -n "Stopping Firmata app... "; /etc/init.d/zzz_firmata_app stop);
echo -n "Uploading... "; cat >/mnt/sda1/firmata_app.js && echo "Done" &&
(echo "Starting Firmata app..."; /etc/init.d/zzz_firmata_app start)'

exit 0
