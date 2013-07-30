CCU.IO
======

Socket.IO basierte Schnittstelle für die HomeMatic CCU (Funk, Wired und CUxD)

CCU.IO ist eine Node.js Applikation die via BIN-RPC mit rfd, hs485d und cuxd kommuniziert. CCU.IO kann - aber muss nicht -
auf der CCU2 installiert werden. Ein integrierter Webserver dient dazu Webbrowsern oder anderen Servern die von
der CCU empfangene Events via Socket.IO durchzureichen.

Die enthaltene BIN RPC Bibliothek binrpc.js und die ReGa-Schnittstelle rega.js kann auch losgelöst von CCU.IO in anderen Node basierten Projekten als Schnittstelle
zur CCU eingesetzt werden.

## Vorraussetzungen

CCU.IO benötigt Node.js das für viele Plattformen inklusive der CCU2 zur Verfügung steht:
* Binärfile für die CCU2 hab ich gebaut und hier veröffentlicht: https://github.com/hobbyquaker/node-ccu2
* Binärpakete für den Raspberry Pi gibt es hier: https://gist.github.com/adammw/3245130
* In den Repositories vieler Linux und BSD Distributionen vorhanden.
* Binaries und Sourcen für Linux, OSX, Solaris und Windows gibt es hier: http://nodejs.org/download/

## Ausprobieren!

* in der Datei settings.js müssen die IP des Hosts auf dem Node.js läuft sowie die IP der CCU angepasst werden. (Läuft CCU.IO auf
der CCU2 selbst kann hier an beiden stellen 127.0.0.1 eingetragen werden.)
* Den Server starten:

    node ccu.io.js

* http://hostname:8080/ccu.io/index.html im Browser aufrufen.

## Todo/Roadmap

## Changelog

## Lizenz

Copyright (c) 2013 hobbyquaker
Lizenz: CC BY-NC 3.0

Sie dürfen:

das Werk bzw. den Inhalt vervielfältigen, verbreiten und öffentlich zugänglich machen
Abwandlungen und Bearbeitungen des Werkes bzw. Inhaltes anfertigen
Zu den folgenden Bedingungen:

Namensnennung - Sie müssen den Namen des Autors/Rechteinhabers in der von ihm festgelegten Weise nennen.
Keine kommerzielle Nutzung — Dieses Werk bzw. dieser Inhalt darf nicht für kommerzielle Zwecke verwendet werden.
Wobei gilt:

Verzichtserklärung - Jede der vorgenannten Bedingungen kann aufgehoben werden, sofern Sie die ausdrückliche Einwilligung des Rechteinhabers dazu erhalten.
Die Veröffentlichung dieser Software erfolgt in der Hoffnung, daß sie Ihnen von Nutzen sein wird, aber OHNE IRGENDEINE GARANTIE, sogar ohne die implizite Garantie der MARKTREIFE oder der VERWENDBARKEIT FÜR EINEN BESTIMMTEN ZWECK.

Die Nutzung dieser Software erfolgt auf eigenes Risiko. Der Author dieser Software kann für eventuell auftretende Folgeschäden nicht haftbar gemacht werden!