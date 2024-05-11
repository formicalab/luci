#!/bin/sh

# Update the Asterisk CEL module
scp -O -r root/* root@192.168.1.1:/
scp -O -r htdocs/* root@192.168.1.1:/www/
