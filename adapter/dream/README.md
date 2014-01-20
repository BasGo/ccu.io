Dreambox adapter
======

* Aktuelle Version: 0.7
* Anzahl verwendeter Variablen in ccu.io: pro konfigurierter Box 7
* getestet mit CCU.IO 1.0.12 und Dreambox DM800se 

## Dokumentation

Dieser Adapter erm�glicht die Anbindung einer Dreambox an CCU.IO f�r das Auslesen aktueller Werte der Dreambox (Stand-By, Lautst�rke, Programm) und das Absetzen von ausgew�hlten Kommandos. Die erste eingerichtete Variable (DREAM.COMMAND) kann zur Bedienung der Dreambox verwendet werden, alle anderen Variablen dienen lediglich der Information bzw. der Verwendung mit Hilfe von weiteren CCU.IO-Mechanismen. Die Konfiguration des Adapters kann durch ein HTML-Formular vorgenommen werden.

### Konfiguration

* **Enabled** - Aktiviert den Adapter 
* **First ID** - Erste ID, die f�r die Datenvariablen genutzt wird
* **Polling enabled** - Aktiviert das zyklische Abrufen von Status-Informationen
* **Polling Interval** - Definition des Abruf-Intervalls (in Sekunden)
* **Message Type** - Typ der Nachricht, mit dem Meldungen auf dem Bildschirm der Dreambox ausgegeben werden
* **Message Timeout** - Anzeigedauer einer auszugebenden Nachricht
* **Debug enabled** - Aktiviert das Loggen von Debug-Informationen

### Konfiguration pro Box
* **Adresse** - IP-Adresse
* **Port** - Port
* **Name** - Name der Box, wird auch f�r den Namen der Datenpunkte verwendet
* **Username** - Benutzername (sofern Authentifizierung aktiviert, sonst leer)
* **Password** - Passwort (sofern Authentifizierung aktiviert, sonst leer)
* **Rooms** - R�ume
* **Functions** - Gewerke
* **Favorites** - Favoriten

### Variablen

* **DREAM.COMMAND** - Nimmt Befehle zur Ausf�hrung entgegen (s.u.)
* **DREAM.STANDBY** - Zeigt an, ob sich die Box im Standby befindet (true) oder nicht (false)
* **DREAM.VOLUME** - Zeigt die aktuell eingestellte Lautst�rke (0 - 100) an
* **DREAM.MUTED** - Zeigt an, ob die Box lautlos gestellt ist oder nicht (unabh�ngig von der eingestellten Lautst�rke!)
* **DREAM.CHANNEL** - Zeigt den aktuell eingestellten Sender an, sofern sich die Box nicht im Standby befindet
* **DREAM.HDD.CAPACITY** - Zeigt die Kapazit�t der eingebauten Festplatte an
* **DREAM.HDD.FREE** - Zeigt an, wieviel Platz noch auf der eingebauten Festplatte verf�gbar ist

### Kommandos

**Information:** Bei einer erfolgreichen Ausf�hrung wird der Inhalt der Variable DREAM.COMMAND gel�scht.

* **MESSAGE:xyz** - Sendet eine Nachricht xyz an die Box, die f�r die in der Konfiguration unter messageTimeout angegebene Zeit auf dem Bildschirm angezeigt wird.
* **MUTE | UNMUTE | MUTE_TOGGLE** - Stellt die Box auf lautlos oder nicht lautlos bzw. wechselt zwischen beiden M�glichkeiten.
* **VOLUME:xy** - Stellt die Lautst�rke auf den Wert xy, wobei es sich hier um einen Wert zwischen 0 und 100 handeln darf.
* **WAKEUP | STANDBY | STANDBY_TOGGLE** - Weckt die Box aus dem Standby oder versetzt sie dorthin. Mit TOOGLESTANDBY ist ein entsprechender Wechsel m�glich.
* **DEEPSTANDBY** - Setzt die Box in den Deep-Standby. Achtung: da in diesem Modus kein Web-Interface verf�gbar ist, muss die Box per Hand wieder reaktiviert werden!
* **REBOOT** - F�hrt einen Reboot bei der Box durch. Achtung: f�r die Zeit des Reboots ist die Box nicht durch den Adapter erreichbar!
* **RESTART** - F�hrt einen Neustart des Enigma-Systems durch. Achtung: f�r die Zeit des Neustarts ist die Box nicht durch den Adapter erreichbar!

* **KEY:xyz** - Sendet ein Fernbedienungscode an die Box. G�ltige Codes f�r xyz sind unter dem nachfolgenden Punkt aufgef�hrt. Ein Beispiel w�re 'KEY:115', der f�r 'Volume up' steht.

### G�ltige Fernbedienungscodes

** Aliase:** Die in den Klammern angegebenen Kommandos dienen als Aliase, d.h. man braucht nicht zwingend die Syntax KEY:Code einzuhalten, sondern man hat direkte Kommandos. Als Beispiel: anstelle des Kommandos "KEY:115" kann auch direkt "VOLUME_UP" (ohne ein vorangestelltes "KEY:") verwendet werden, beides w�rde dazu f�hren, dass die Lautst�rke erh�ht wird.

* **116** - Taste "Power" ("STANDBY_TOGGLE")
* **412** - Taste "previous" ("PREV")
* **407** - Taste "next ("NEXT")
* **115** - Taste "volume up" ("VOLUME_UP")
* **114** - Taste "volume down" ("VOLUME_DOWN")
* **402** - Taste "bouquet up" ("BOUQUET_UP")
* **403** - Taste "bouquet down" ("BOUQUET_DOWN")
* **113** - Taste "mute" ("MUTE_TOGGLE")
* **174** - Taste "lame" ("EXIT")
* **358** - Taste "info" ("INFO")
* **139** - Taste "menu" ("MENU")
* **103** - Taste "up"  ("UP")
* **108** - Taste "down" ("DOWN")
* **105** - Taste "left" ("LEFT" oder "CH_DOWN")
* **106** - Taste "right"  ("RIGHT" oder "CH_UP")
* **352** - Taste "OK" ("OK")
* **2** - Taste "1"	
* **3** - Taste "2"
* **4** - Taste "3"
* **5** - Taste "4"
* **6** - Taste "5"
* **7** - Taste "6"
* **8** - Taste "7"
* **9** - Taste "8"
* **10** - Taste "1"
* **11** - Taste "0"
* **392** - Taste "audio"
* **393** - Taste "video"
* **398** - Taste "red"
* **399** - Taste "green"
* **400** - Taste "yellow"
* **401** - Taste "blue"
* **377** - Taste "tv"
* **385** - Taste "radio"
* **388** - Taste "text"
* **138** - Taste "help"

## Todo/Roadmap

* Implementierung weiterer Funktionen
* Vereinheitlichung der Datenpunkt-Struktur zur Anpassung an bereits vorhandene, andere Adapter
* Weitere Kommando-Auswertungen

## Changelog

### 0.7
* Verwendung von Alias-Werten f�r eine Vielzahl von Fernbedienungscodes
* Toggle-Kommandos vereinheitlicht (sind nun STANDBY_TOGGLE und MOTE_TOGGLE)

### 0.6
* Emulation der kompletten Fernbedienung. Im Moment werden nur die Zahlencodes verarbeitet, eventuell Aliase kommen sp�ter ggf. im Zuge einer Vereinheitlichung aller CCU.IO-Medienadapter (LGTV, Sonos, Onkyo, Dreambox etc.)

### 0.5
* Authentifizierung hinzugef�gt (ggf. L�schen der datastore\adapter-dream.json notwendig)
* Fehler f�r VU+ und Ger�te mit openwebif behoben (nun richtige Korrektur von Linefeeds)

### 0.4
* Fehler beim Speichern von Werten behoben (war object anstatt bool oder string)
* Konfiguration mehrerer Boxen erm�glicht
* Debug-Modus implementiert
* Fix f�r VU+ und Ger�te mit openwebif implementiert (Linefeed bei Bools)

### 0.3
* Umstellung der Konfiguration (JSON -> Formular)
* weitere Konfigurationsm�glichkeiten (Nachrichtentyp, Polling aktivieren/deaktivieren)
* Implementierung weiterer Kommandos (TOOGLESTANDBY, TOOGLEMUTE, etc.)
* Ausbau der Dokumentation

### 0.2
* Neue Variablen DREAM.VOLUME, DREAM.MUTED, DREAM.CHANNEL, DREAM.HDD.CAPACITY und DREAM.HDD.FREE
* �nderung des Requests, der zur Box geschickt wird
* Tausch der Kommando-Variablen (war firstId + 1, nun firstId)

### 0.1
* Erste Version mit Grundfunktionalit�ten

## Lizenz

Copyright (c) 2014 BasGo

Lizenz: [CC BY-NC 3.0](http://creativecommons.org/licenses/by-nc/3.0/de/)

Sie d�rfen das Werk bzw. den Inhalt vervielf�ltigen, verbreiten und �ffentlich zug�nglich machen,
Abwandlungen und Bearbeitungen des Werkes bzw. Inhaltes anfertigen zu den folgenden Bedingungen:

  * **Namensnennung** - Sie m�ssen den Namen des Autors/Rechteinhabers in der von ihm festgelegten Weise nennen.
  * **Keine kommerzielle Nutzung** - Dieses Werk bzw. dieser Inhalt darf nicht f�r kommerzielle Zwecke verwendet werden.

###Verzichtserkl�rung

Jede der vorgenannten Bedingungen kann aufgehoben werden, sofern Sie die ausdr�ckliche Einwilligung des Rechteinhabers dazu erhalten.

###Gew�hrleistungsausschluss

Die Ver�ffentlichung dieser Software erfolgt in der Hoffnung, da� sie Ihnen von Nutzen sein wird, aber **ohne irgendeine implizite oder explizite Garantie** der **Marktreife** oder der **Verwendbarkeit f�r einen bestimmten Zweck**. Jegliche Nutzung dieser Software erfolgt **auf eigenes Risiko**!
