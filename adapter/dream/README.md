Dreambox adapter
======

* Aktuelle Version: 0.4
* Anzahl verwendeter Variablen in ccu.io: 7
* getestet mit CCU.IO 1.0.12 und Dreambox DM800se 

## Dokumentation

Dieser Adapter erm�glicht die Anbindung einer Dreambox an CCU.IO f�r das Auslesen aktueller Werte der Dreambox (Stand-By, Lautst�rke, Programm) und das Absetzen von ausgew�hlten Kommandos. Die erste eingerichtete Variable (DREAM.COMMAND) kann zur Bedienung der Dreambox verwendet werden, alle anderen Variablen dienen lediglich der Information bzw. der Verwendung mit Hilfe von weiteren CCU.IO-Mechanismen. Die Konfiguration des Adapters kann durch ein HTML-Formular vorgenommen werden.

### Konfiguration

* **Enabled** - Aktiviert den Adapter 
* **First ID** - Erste ID, die f�r die Datenvariablen genutzt wird
* **Dreambox (IP)** - IP-Adresse der Dreambox
* **Dreambox (Port)** - Port des Web-Interfaces des Dreambox
* **Polling enabled** - Aktiviert das zyklische Abrufen von Status-Informationen
* **Polling Interval** - Definition des Abruf-Intervalls (in Sekunden)
* **Message Type** - Typ der Nachricht, mit dem Meldungen auf dem Bildschirm der Dreambox ausgegeben werden
* **Message Timeout** - Anzeigedauer einer auszugebenden Nachricht

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
* **MUTE | UNMUTE | TOOGLEMUTE** - Stellt die Box auf lautlos oder nicht lautlos bzw. wechselt zwischen beiden M�glichkeiten.
* **VOLUME:xy** - Stellt die Lautst�rke auf den Wert xy, wobei es sich hier um einen Wert zwischen 0 und 100 handeln darf.
* **WAKEUP | STANDBY | TOOGLESTANDBY** - Weckt die Box aus dem Standby oder versetzt sie dorthin. Mit TOOGLESTANDBY ist ein entsprechender Wechsel m�glich.
* **DEEPSTANDBY** - Setzt die Box in den Deep-Standby. Achtung: da in diesem Modus kein Web-Interface verf�gbar ist, muss die Box per Hand wieder reaktiviert werden!
* **REBOOT** - F�hrt einen Reboot bei der Box durch. Achtung: f�r die Zeit des Reboots ist die Box nicht durch den Adapter erreichbar!
* **RESTART** - F�hrt einen Neustart des Enigma-Systems durch. Achtung: f�r die Zeit des Neustarts ist die Box nicht durch den Adapter erreichbar!

## Todo/Roadmap

* Implementierung weiterer Funktionen

## Changelog

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
