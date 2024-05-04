#!/bin/sh

# Update the Asterisk CEL module
scp -r root/* root@192.168.1.1:/
scp -r htdocs/* root@192.168.1.1:/www/