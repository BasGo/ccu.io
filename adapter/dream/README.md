Dreambox adapter
======

* Aktuelle Version: 0.2
* Anzahl verwendeter Variablen in ccu.io: 7

getestet mit Dreambox DM800se

## Dokumentation

* Dieser Adapter erm�glicht die Anbindung einer Dreambox an ccu.io
* Die erste Variable dient als Kommando-Variable, d.h. hier ist es m�glich, Befehle an die Box zu senden. Bei einer erfolgreichen Ausf�hrung wird der Inhalt der Variablen gel�scht.

* Konfiguration �ber settings.json (in adapter\dream):
  enabled:  true|false
  IP:             xxx.xxx.xxx.xxx  (IP der Dreambox)
  messageTimeout: xxxxx  (Dauer der Anzeige einer Nachricht)
  firstId:        xxxxxx  (Erste ID, standardm��ig 95100) 

### Variablen

* firstId     : DREAM.COMMAND
  Nimmt Befehle zur Ausf�hrung entgegen (s.u.)
  
* firstId + 1 : DREAM.STANDBY
  Zeigt an, ob sich die Box im Standby befindet (true) oder nicht (false)
  
* firstId + 2 : DREAM.VOLUME
  Zeigt die aktuell eingestellte Lautst�rke (0 - 100) an
  
* firstId + 3 : DREAM.MUTED
  Zeigt an, ob die Box lautlos gestellt ist oder nicht (unabh�ngig von der eingestellten Lautst�rke!)
  
* firstId + 4 : DREAM.CHANNEL
  Zeigt den aktuell eingestellten Sender an, sofern sich die Box nicht im Standby befindet
  
* firstId + 5 : DREAM.HDD.CAPACITY
  Zeigt die Kapazit�t der eingebauten Festplatte an
  
* firstId + 6 : DREAM.HDD.FREE
  Zeigt an, wieviel Platz noch auf der eingebauten Festplatte verf�gbar ist

### Kommandos

* MESSAGE:xyz
  Sendet eine Nachricht xyz an die Box, die f�r die in der Konfiguration unter messageTimeout angegebene Zeit auf dem Bildschirm angezeigt wird.
  
* MUTE | UNMUTE | TOOGLEMUTE
  Stellt die Box auf lautlos oder nicht lautlos bzw. wechselt zwischen beiden M�glichkeiten.
  
* VOLUME:xy
  Stelt die Lautst�rke auf den Wert xy, wobei es sich hier um einen Wert zwischen 0 und 100 handeln darf.
  
* WAKEUP | STANDBY | TOOGLESTANDBY
  Weckt die Box aus dem Standby oder versetzt sie dorthin. Mit TOOGLESTANDBY ist ein entsprechender Wechsel m�glich.
  
* DEEPSTANDBY
  Setzt die Box in den Deep-Standby. Achtung: da in diesem Modus kein Web-Interface verf�gbar ist, muss die Box per Hand wieder reaktiviert werden!
  
* REBOOT
  F�hrt einen Reboot bei der Box durch. Achtung: f�r die Zeit des Reboots ist die Box nicht durch den Adapter erreichbar!
  
* RESTART
  F�hrt einen Neustart des Enigma-Systems durch. Achtung: f�r die Zeit des Neustarts ist die Box nicht durch den Adapter erreichbar!
  
## Todo/Roadmap

* Einstellungen per HTML-Formular editieren
* Implementierung weiterer Funktionen

## Changelog

### 0.2
* Neue Variablen DREAM.VOLUME, DREAM.MUTED, DREAM.CHANNEL, DREAM.HDD.CAPACITY und DREAM.HDD.FREE
* �nderung des Requests, der zur Box geschickt wird
* Tausch der Kommando-Variablen (war firstId + 1, ist nun firstId)

### 0.1
* Erste Version mit Grundfunktionalit�ten

## Lizenz

Copyright (c) 2014 BasGo

Lizenz: [CC BY-NC 3.0](http://creativecommons.org/licenses/by-nc/3.0/de/)

Sie d�rfen das Werk bzw. den Inhalt vervielf�ltigen, verbreiten und �ffentlich zug�nglich machen,
Abwandlungen und Bearbeitungen des Werkes bzw. Inhaltes anfertigen zu den folgenden Bedingungen:

  * **Namensnennung** - Sie m�ssen den Namen des Autors/Rechteinhabers in der von ihm festgelegten Weise nennen.
  * **Keine kommerzielle Nutzung** - Dieses Werk bzw. dieser Inhalt darf nicht f�r kommerzielle Zwecke verwendet werden.

Wobei gilt:
Verzichtserkl�rung - Jede der vorgenannten Bedingungen kann aufgehoben werden, sofern Sie die ausdr�ckliche Einwilligung des Rechteinhabers dazu erhalten.
Die Ver�ffentlichung dieser Software erfolgt in der Hoffnung, da� sie Ihnen von Nutzen sein wird, aber OHNE IRGENDEINE GARANTIE, sogar ohne die implizite Garantie der MARKTREIFE oder der VERWENDBARKEIT F�R EINEN BESTIMMTEN ZWECK. Die Nutzung dieser Software erfolgt auf eigenes Risiko!
=====