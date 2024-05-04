# This is free software, licensed under the Apache License, Version 2.0
# Copyright 2024 Marcello Formica

include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI app to show Asterisk CEL records
LUCI_DEPENDS:=+luci-base +asterisk-cel-custom +coreutils-truncate

PKG_MAINTAINER:=Marcello Formica <formicalab@live.it>
PKG_VERSION:=1.0
PKG_LICENSE:=Apache-2.0

include ../../luci.mk

# call BuildPackage - OpenWrt buildroot signature