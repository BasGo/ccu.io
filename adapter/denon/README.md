Denon adapter
======
* entwickelt auf Basis des Onkyo-Adapters von Eisbaeeer (vielen dank daf�r!)
* getestet mit Denon AVR-X3000

## Dokumentation

* Dieser Adapter erm�glicht die Anbindung eines Denon Reveivers an ccu.io
* Es werden Variable in der ccu.io erstellt.
* Die erste Variable kann als Sendevariable zum Denon verwendet werden. Wird dort
  z.B. ein "MUON" gesetzt, wird der Befehl "Mute On" an den Denon 
  gesendet. Anschlie�end wird die Variable wieder geleert. Eine �bersicht der 
  m�glichen Befehle gibt es in der offiziellen Dokumentation von Denon 
  http://assets.denoneu.com/DocumentMaster/DE/AVRX3000_PROTOCOL(10.2.0)_V01.pdf
* In der zweiten Variable wird der Wert 'Denon' gesetzt, wenn der letzte interpretierbare 
  Befehl vom Receiver empfangenen wurde. Hintergrund ist, dass ich ein CCU.IO-Script 
  parallel laufen habe, dass auf Basis der CCU.IO-Variablen Homematic-Variablen setzt 
  bzw. CuxD-Ger�te schaltet. Eine Variable 'Denon AVR sendCommand' nimmt den Wert FALSE 
  an, wenn der Denon einen Wert gesetzt hat. Ein HM-Programm pr�ft, ob die Variable den 
  Wert FALSE annimmt und setzt die CCU.IO-Variable 3 Sekunden verz�gert auf den Wert 'RESET'.
  Dies hat den Vorteil, dass z.B. beim �ndern der Lautst�rke �ber die Fernbedienung zwar 
  sofort der aktuelle Wert in der HM empfangen wird. Das Programm, dass jedoch den 
  HM-Lautst�rkewert �ber CCU.IO an den Receiver sendet f�r eben diese 3 Sekunden unterdr�ckt wird.
  Sorry, f�r diesen bestimmt schwierig nachzuvollziehenden Weg, aber mir ist kein anderer eingefallen.
  F�r alle anderen, denen es reicht, die Werte �ber CCU.IO zu setzen, spielt die zweite Variable keine Rolle.
  
* Konfiguration �ber settings.js unter adapter:
  enabled:  true|false
  IP:       xxx.xxx.xxx.xxx (Onkyo Reveiver)
  Port:     xxxxx  (Denon Port)
  FirstId:  xxxxxx  (Erste ID, �ber 100000 verwenden!) 
  Debug: 	true|false (bei true werden die empfangenen Befehle des Denons in die ccu.io.log geschrieben

## Todo/Roadmap

* HTML in settings.js integrieren 
* mehr Befehle integrieren


## Changelog


### 0.1.0
* First launch

## Lizenz

Copyright (c) 2014 BlueEssi
Lizenz: [CC BY-NC 3.0](http://creativecommons.org/licenses/by-nc/3.0/de/)

Sie d�rfen das Werk bzw. den Inhalt vervielf�ltigen, verbreiten und �ffentlich zug�nglich machen,
Abwandlungen und Bearbeitungen des Werkes bzw. Inhaltes anfertigen zu den folgenden Bedingungen:

  * **Namensnennung** - Sie m�ssen den Namen des Autors/Rechteinhabers in der von ihm festgelegten Weise nennen.
  * **Keine kommerzielle Nutzung** - Dieses Werk bzw. dieser Inhalt darf nicht f�r kommerzielle Zwecke verwendet werden.
  * Wobei gilt: Verzichtserkl�rung - Jede der vorgenannten Bedingungen kann aufgehoben werden, sofern Sie die ausdr�ckliche Einwilligung des Rechteinhabers dazu erhalten.
  * Die Ver�ffentlichung dieser Software erfolgt in der Hoffnung, da� sie Ihnen von Nutzen sein wird, aber OHNE IRGENDEINE GARANTIE, sogar ohne die implizite Garantie der MARKTREIFE oder der VERWENDBARKEIT F�R EINEN BESTIMMTEN ZWECK. Die Nutzung dieser Software erfolgt auf eigenes Risiko!

=====

* This project needs ccu.io
* This project allow connection to Denon network enabled receiver
