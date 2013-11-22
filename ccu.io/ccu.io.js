/**
 *      CCU.IO
 *
 *      Socket.IO based HomeMatic Interface
 *
 *      Copyright (c) 2013 http://hobbyquaker.github.io
 *
 *      CC BY-NC 3.0
 *
 *      Kommerzielle Nutzung nicht gestattet!
 *
 */

var settings = require(__dirname+'/settings.js');

settings.version = "0.9.81";
settings.basedir = __dirname;

var fs = require('fs'),
    logger =    require(__dirname+'/logger.js'),
    binrpc =    require(__dirname+"/binrpc.js"),
    rega =      require(__dirname+"/rega.js"),
    express =   require('express'),
    http =      require('http'),
    https =     require('https'),
    crypto =    require('crypto'),
    request =   require('request'),
    app,
    appSsl,
    url = require('url'),
    server,
    serverSsl,
    socketio =  require('socket.io'),
    io,
    ioSsl,
    devlogCache = [],
    notFirstVarUpdate = false,
    children = [],
    childScriptEngine,
    pollTimer,
    ccuReachable = false,
    ccuRegaUp = false,
    webserverUp = false,
    initsDone = false,
    lastEvents = {},
    authHash = "";

var childProcess = require('child_process');

if (settings.ioListenPort) {
    app =  express();

    if (settings.authentication && settings.authentication.enabled) {
        app.use(express.basicAuth(settings.authentication.user, settings.authentication.password));
    }

    server =    require('http').createServer(app)

}

// Create md5 hash of user and password
if (settings.authentication.user && settings.authentication.password) {
    // We can add the client IP address, so the key will be different for every client, but the server should calculate hash on the fly
    authHash = crypto.createHash('md5').update(settings.authentication.user+settings.authentication.password).digest("hex");
}

if (settings.ioListenPortSsl) {
    var options = null;

    // Zertifikate vorhanden?
    try {
        options = {
            key: fs.readFileSync(__dirname+'/cert/privatekey.pem'),
            cert: fs.readFileSync(__dirname+'/cert/certificate.pem')
        };
    } catch(err) {
        logger.error(err.message);
    }
    if (options) {
        appSsl = express();
        if (settings.authentication && settings.authentication.enabledSsl) {
            appSsl.use(express.basicAuth(settings.authentication.user, settings.authentication.password));
        }
        serverSsl = require('https').createServer(options, appSsl);
    }
}

if (settings.binrpc.checkEvents && settings.binrpc.checkEvents.enabled) {
    setInterval(function () {
        if (initsDone && ccuRegaUp) {
            var now = Math.floor((new Date()).getTime() / 1000);
            var check = now - settings.binrpc.checkEvents.testAfter;
            var reinit = now - settings.binrpc.checkEvents.reinitAfter;
            for (var i = 0; i < settings.binrpc.inits.length; i++) {
                var init = settings.binrpc.inits[i];
                if (lastEvents[init.id] < reinit) {

                    if (settings.binrpc.checkEvents.testTrigger[init.id]) {
                        logger.warn("binrpc    --> re-init "+init.id);

                        homematic.request(init.port, "init", ["xmlrpc_bin://"+settings.listenIp+":"+settings.listenPort,init.id], function(data, name) {
                            if (data === "") {
                                logger.info("binrpc    <-- init on "+name+" successful");
                            } else {
                                logger.error("binrpc    <-- init on "+name+" failure");
                            }
                        });

                    } else {
                        logger.warn("binrpc        checkEvent.trigger undefined for "+init.id);
                    }

                } else if (lastEvents[init.id] < check) {
                    logger.verbose("binrpc        checking init "+init.id);
                    if (settings.binrpc.checkEvents.testTrigger[init.id]) {
                        var id = regaIndex.Name[settings.binrpc.checkEvents.testTrigger[init.id]][0];
                        regahss.script("dom.GetObject("+id+").State(true);");
                    } else {
                        logger.warn("binrpc        checkEvent.trigger undefined for "+init.id);
                    }
                } else {
                    logger.verbose("binrpc        init "+init.id+" ok - last event "+(now-lastEvents[init.id])+"s ago");
                }
            }
        }

    }, (settings.binrpc.checkEvents.interval * 1000));
}

var socketlist = [],
    homematic,
    stringtable = {},
    datapoints = {},
    regaObjects = {},
    regaIndex = {
        Name: {},
        Address: {}
    },
    regaReady;

var ignoreNextUpdate = [];

logger.info("ccu.io        starting version "+settings.version + " copyright (c) 2013 hobbyquaker http://hobbyquaker.github.io");
logger.verbose("ccu.io        commandline "+JSON.stringify(process.argv));

var debugMode = (process.argv.indexOf("--debug") != -1 ? true : false);

var regahss = new rega({
    ccuIp: settings.ccuIp,
    ready: function(err) {
        if (err == "ReGaHSS down") {
            logger.error("rega          ReGaHSS down");
            ccuReachable = true;
            ccuRegaUp = false;
            if (io) {
                io.sockets.emit("regaDown");
            }
            if (ioSsl) {
                ioSsl.sockets.emit("regaDown");
            }
            tryReconnect();
        } else if (err == "CCU unreachable") {
            logger.error("ccu.io        CCU unreachable");
            ccuReachable = false;
            ccuRegaUp = false;
            if (io) {
                io.sockets.emit("ccuDown");
            }
            if (ioSsl) {
                ioSsl.sockets.emit("ccuDown");
            }
            tryReconnect();
        } else {
            logger.info("rega          ReGaHSS up");
            ccuReachable = true;
            ccuRegaUp = true;

            regahss.loadStringTable(settings.stringTableLanguage, function (data) {
                stringtable = data;
                regahss.checkTime(loadRegaData);

            });



        }
    }
});

if (settings.logging.enabled) {
    //devlog = fs.createWriteStream(__dirname+"/log/"+settings.logging.file, {
    //    flags: "a", encoding: "utf8", mode: 0644
    //});

    setInterval(writeLog, settings.logging.writeInterval * 1000);

    if (settings.logging.move) {
        var midnight = new Date();
        midnight.setHours( 23 );
        midnight.setMinutes( 59 );
        midnight.setSeconds( 59 );
        midnight.setMilliseconds( 950 );
        setTimeout(moveLog, midnight.getTime() - new Date().getTime());
    }
}



var stats = {
    clients: 0,
    cuxd: 0,
    wired: 0,
    rf: 0,
    start: ((new Date()).getTime()),
    uptime: function() {
        var mseconds = ((new Date()).getTime()) - stats.start;
        var diff = new Date(mseconds);
        var hours = diff.getHours();
        var days = Math.floor(hours/24);
        hours = hours - (24 * days);
        return days+" Tage, "+(hours-1)+" Stunden, "+ diff.getMinutes()+" Minuten, "+diff.getSeconds()+" Sekunden";
    },
    log: function() {
        logger.info("ccu.io stats  cuxd: "+(stats.cuxd/settings.statsIntervalMinutes).toFixed(0)+"msg/min, wired: "+(stats.wired/settings.statsIntervalMinutes).toFixed(0)+"msg/min, rf: "+(stats.rf/settings.statsIntervalMinutes).toFixed(0)+"msg/min");
        logger.info("ccu.io stats  "+socketlist.length+" Socket.IO Clients connected");
        logger.verbose("ccu.io uptime "+stats.uptime());
        stats.cuxd = 0;
        stats.wired = 0;
        stats.rf = 0;
    }
}

if (settings.stats) {
    setInterval(stats.log, settings.statsIntervalMinutes * 60000);
}

function sendEvent(arr) {
    logger.verbose("socket.io --> broadcast event "+JSON.stringify(arr))
    if (io) {
        io.sockets.emit("event", arr);
    }
    if (ioSsl) {
        ioSsl.sockets.emit("event", arr);
    }
}

function setDatapoint(id, val, ts, ack, lc) {
    if (!regaReady) { return; }
    // unescape HomeMatic Script WriteURL()
    if (typeof val == "string") {
        val = unescape(val);
    }

    var oldval = datapoints[id];
    var obj; // Event argument

    logger.verbose("setDatapoint "+JSON.stringify(oldval)+" -> "+JSON.stringify([val,ts,ack,lc]));


    if (!oldval) {
        // Neu
        if (!regaObjects[id]) {
            logger.warn("rega      <-- unknown variable "+id);
        }
        sendEvent(obj);


        datapoints[id] = [val,ts,ack,lc];
        obj = [id,val,ts,ack,lc];
        sendEvent(obj);

    } else {

        // Änderung
        if (!lc && val != oldval[0]) {
            lc = formatTimestamp();
        } else {
            lc = oldval[3];
        }

        datapoints[id] = [val,ts,ack,lc];
        obj = [id,val,ts,ack,lc];

        if (val == oldval[0] && ack == oldval[2] && ts == oldval[1] && lc == oldval[3]) {
            // Keine Änderung
        } else {
            sendEvent(obj);
        }

        /*
         if (ack && !oldval[2]) {
         // Bestätigung
         logger.info("ack "+JSON.stringify(oldval)+" -> "+JSON.stringify([val,ts,ack,lc]));
         sendEvent(obj);
         } else if (val != oldval[0]) {
         // Änderung
         logger.info("chg "+JSON.stringify(oldval)+" -> "+JSON.stringify([val,ts,ack,lc]));
         sendEvent(obj);
         } else if (ts !== oldval[1]) {
         // Aktualisierung
         logger.info("ts "+JSON.stringify(oldval)+" -> "+JSON.stringify([val,ts,ack,lc]));
         sendEvent(obj);
         } else {
         // Keine Änderung
         logger.info("eq "+JSON.stringify(oldval)+" -> "+JSON.stringify([val,ts,ack,lc]));
         }
         */

    }
}

function tryReconnect() {
    logger.info("ccu.io        trying to reconnect to CCU");
    request('http://'+regahss.options.ccuIp+'/ise/checkrega.cgi', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            if (body == "OK") {
                logger.info("ccu.io        ReGaHSS up");
                ccuReachable = true;
                ccuRegaUp = true;
                reconnect();
            } else {
                logger.error("ccu.io        ReGaHSS down");
                ccuRegaUp = false;
                setTimeout(tryReconnect, 10000);
            }
        } else {
            logger.error("ccu.io        CCU unreachable");
            ccuRegaUp = false;
            ccuReachable = false;
            setTimeout(tryReconnect, 10000);
			
			if (debugMode) {
				// Just start webServer for debug
				if (!webserverUp) {
					initWebserver();
				}
			}
        }
    });
}

function reconnect() {

    regahss.loadStringTable(settings.stringTableLanguage, function (data) {
        stringtable = data;
    });

    if (initsDone) {
        homematic.stopInits();
    }

    regaReady = false;
    clearRegaData();
    setTimeout(function () {
        regahss.checkTime(function () {
            loadRegaData(0, null, null, true);
        });
    }, 2500);

}

function pollRega() {
    regahss.runScriptFile("polling", function (data) {
        if (!data) {
            ccuRegaUp = false;
            tryReconnect();
            return false;
        }
        var data = JSON.parse(data);
        var val;
        for (id in data) {
            if (settings.logging.enabled) {
                var ts = Math.round((new Date()).getTime() / 1000);
                if (typeof data[id][0] == "string") {
                    val = unescape(data[id][0]);
                } else {
                    val = data[id][0];
                }

                if (settings.logging.varChangeOnly && notFirstVarUpdate) {
                    if (datapoints[id][0] != val) {
                        devLog(ts, id, val);
                    }
                } else {
                    devLog(ts, id, val);
                }
                // Hat sich die Anzahl der Servicemeldungen geändert?
                if (id == 41 && datapoints[id][0] != val) {
                    pollServiceMsgs();
                }
            }
            setDatapoint(id, data[id][0], formatTimestamp(), true, data[id][1]);
        }
        notFirstVarUpdate = true;
        pollTimer = setTimeout(pollRega, settings.regahss.pollDataInterval);
    });
}

function pollServiceMsgs() {
    logger.info("ccu.io        polling service messages");
    regahss.runScriptFile("alarms", function (data) {
        if (!data) {
            ccuRegaUp = false;
            tryReconnect();
            return false;
        }
        var data = JSON.parse(data);
        var val;
        for (id in data) {
            var ts = Math.round((new Date()).getTime() / 1000);
            devLog(ts, id, data[id].AlState);
            setDatapoint(id, data[id].AlState, data[id].LastTriggerTime, true, data[id].AlOccurrenceTime);
        }
    });
}

function loadRegaData(index, err, rebuild, triggerReload) {
    if (!index) { index = 0; }
    if (err && debugMode) {
        // Just start webServer for debug
        if (!webserverUp) {
            initWebserver();
        }
        return;
    }
    var type = settings.regahss.metaScripts[index];
    logger.info("rega          fetching "+type);
    regahss.runScriptFile(type, function (data) {
        var data = JSON.parse(data);
        logger.info("ccu.io        indexing "+type);
        var timestamp = formatTimestamp();
        for (var id in data) {
            var idInt = parseInt(id, 10);

            // HomeMatic Script "WriteURL" dekodieren
            for (var key in data[id]) {
                // Nur Strings und auf keinen Fall Kanal- oder Datenpunkt-Arrays
                if (typeof data[id][key] == "string" && key !== "Channels" && key !== "DPs") {
                    data[id][key] = unescape(data[id][key]);
                }
            }

            // Index erzeugen
            if (type == "alarms") {
                var TypeName = "ALDP";
            } else {
                var TypeName = data[id].TypeName;
            }
            // Typen-Index (einfach ein Array der IDs)
            if (!regaIndex[TypeName]) {
                regaIndex[TypeName] = [];
            }
            regaIndex[TypeName].push(idInt);
            // Namens-Index
            regaIndex.Name[data[id].Name] = [idInt, TypeName, data[id].Parent];
            // ggf. Adressen-Index
            if (data[id].Address) {
                regaIndex.Address[data[id].Address] = [idInt, TypeName, data[id].Parent];
            }

            // ggf. Werte setzen
            if (type == "variables") {
                datapoints[id] = [data[id].Value, data[id].Timestamp, true, data[id].Timestamp];
                // Werte aus data Objekt entfernen
                delete data[id].Value;
                delete data[id].Timestamp;
            }
            if (type == "datapoints") {
                datapoints[id] = [data[id].Value, timestamp, true, data[id].Timestamp];
                // Werte aus data Objekt entfernen
                delete data[id].Value;
                delete data[id].Timestamp;
            }
            if (type == "alarms") {

                // Kanal ergänzen
                if (!regaObjects[data[id].Parent].ALDPs) {
                    regaObjects[data[id].Parent].ALDPs = {};
                }
                var tmpType = data[id].Name.split(".");
                tmpType = tmpType[1];
                regaObjects[data[id].Parent].ALDPs[tmpType] = parseInt(id, 10);

                // Wert setzen
                datapoints[id] = [data[id].AlState, data[id].LastTriggerTime, true, data[id].AlOccurrenceTime];
                // Werte aus data Objekt entfernen
                delete data[id].AlState;
                delete data[id].LastTriggerTime;
                delete data[id].AlOccurrenceTime;
            }

            // Meta-Daten setzen
            regaObjects[id] = data[id];
        }

        index += 1;
        if (index < settings.regahss.metaScripts.length) {
            loadRegaData(index, null, rebuild);
        } else {
            regaReady = true;
            if (rebuild) {
                logger.info("rega          data succesfully reloaded");
                logger.info("socket.io --> broadcast reload")
                if (io) {
                    io.sockets.emit("reload");
                }
                if (ioSsl) {
                    ioSsl.sockets.emit("reload");
                }

            } else {
                logger.info("rega          data succesfully loaded");
            }


            if (!rebuild) {
                if (settings.regahss.pollData) {
                    pollRega();
                }
                initRpc();
                if (!webserverUp) {
                    initWebserver();
                }
                if (triggerReload) {
                    logger.info("socket.io --> broadcast reload")
                    if (io) {
                        io.sockets.emit("regaUp");
                        io.sockets.emit("reload");
                    }
                    if (ioSsl) {
                        ioSsl.sockets.emit("regaUp");
                        ioSsl.sockets.emit("reload");
                    }
                }

            }
        }

    });

}

function initRpc() {
    initsDone = true;

    for (var i = 0; i < settings.binrpc.inits.length; i++) {
        lastEvents[settings.binrpc.inits[i].id] = Math.floor((new Date()).getTime() / 1000);
    }

    if (!homematic) {
        homematic = new binrpc({
            ccuIp: settings.ccuIp,
            listenIp: settings.binrpc.listenIp,
            listenPort: settings.binrpc.listenPort,
            inits: settings.binrpc.inits,
            methods: {
                event: function (obj) {

                    if (!regaReady) { return; }

                    var timestamp = formatTimestamp();

                    var bidcos;
                    switch (obj[0]) {
                        case "io_cuxd":
                        case "CUxD":
                            lastEvents.io_cuxd = Math.floor((new Date()).getTime() / 1000);
                            stats.cuxd += 1;
                            bidcos = "CUxD." + obj[1] + "." + obj[2];
                            break;
                        case "io_rf":
                            lastEvents.io_rf = Math.floor((new Date()).getTime() / 1000);
                            stats.rf += 1;
                            bidcos = "BidCos-RF." + obj[1] + "." + obj[2];
                            break;
                        case "io_wired":
                            lastEvents.io_wired = Math.floor((new Date()).getTime() / 1000);
                            stats.wired += 1;
                            bidcos = "BidCos-Wired." + obj[1] + "." + obj[2];
                            break;
                        default:
                        //
                    }

                    if (bidcos == settings.pollDataTrigger) {
                        clearTimeout(pollTimer);
                        pollRega();
                    }

                    // STATE korrigieren
                    if (obj[2] == "STATE") {
                        if (obj[3] === "1" || obj[3] === 1) {
                            obj[3] = true;
                        } else if (obj[3] === "0" || obj[3] === 0) {
                            obj[3] = false;
                        }
                    }

                    // Get ReGa id
                    var regaObj = regaIndex.Name[bidcos];

                    if (regaObj && regaObj[0] && ignoreNextUpdate.indexOf(regaObj[0]) != -1) {
                        logger.verbose("ccu.io        ignoring event dp "+regaObj[0]);
                        ignoreNextUpdate.splice(ignoreNextUpdate.indexOf(regaObj[0]), 1);
                        return;
                    }

                    // Logging
                    if (regaObj && regaObj[0] && settings.logging.enabled) {
                        if (!regaObjects[regaObj] || !regaObjects[regaObj].dontLog) {
                            var ts = Math.round((new Date()).getTime() / 1000);
                            devLog(ts, regaObj[0], obj[3]);
                        }
                    }

                    if (regaObj && regaObj[0]) {
                        var id = regaObj[0];
                        var val = obj[3];
                        logger.verbose("socket.io --> broadcast event "+JSON.stringify([id, val, timestamp, true]))
                        var event = [id, val, timestamp, true, timestamp];

                        if (datapoints[id]) {
                            if (datapoints[id][0] != val) {
                                // value changed
                                datapoints[id] = [val, timestamp, true, timestamp];
                            } else {
                                // no change - keep LastChange
                                datapoints[id] = [val, timestamp, true, datapoints[id][3]];
                                event = [id, val, timestamp, true, datapoints[id][3]];
                            }
                        } else {
                            datapoints[id] = [val, timestamp, true, timestamp];
                        }
                        if (io) {
                            io.sockets.emit("event", event);
                        }
                        if (ioSsl) {
                            ioSsl.sockets.emit("event", event);
                        }

                    }

                    return "";
                }
            }
        });
    } else {
        homematic.init();
    }

}

function uploadParser(req, res, next) {
    var urlParts = url.parse(req.url, true);
    var query = urlParts.query;

    //console.log(query);

    // get the temporary location of the file
    var tmpPath = req.files.file.path;

    logger.info("webserver <-- file upload "+req.files.file.name+" ("+req.files.file.size+" bytes) to "+tmpPath);
    logger.info("webserver <-- file upload query params "+JSON.stringify(query));

    var newName;
    if (query.id) {
        newName = query.id + "." + req.files.file.name.replace(/.*\./, "");
    } else {
        newName = req.files.file.name;
    }
    // set where the file should actually exists - in this case it is in the "images" directory
    var targetPath = __dirname + "/" + query.path + newName;
    logger.info("webserver     move uploaded file "+tmpPath+" -> "+targetPath);


    // move the file from the temporary location to the intended location
    fs.rename(tmpPath, targetPath, function(err) {
        if (err) throw err;
        // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
        fs.unlink(tmpPath, function() {
            if (err) throw err;
            res.send('File uploaded to: ' + targetPath + ' - ' + req.files.file.size + ' bytes');
        });
    });
}

function findDatapoint(needle, hssdp) {
    if (!datapoints[needle]) {
        if (regaIndex.Name[needle]) {
            // Get by Name
            needle = regaIndex.Name[needle][0];
            if (hssdp) {
                // Get by Name and Datapoint
                if (regaObjects[needle].DPs) {
                    return regaObjects[needle].DPs[hssdp];
                } else {
                    return false;
                }
            }
        } else if (regaIndex.Address[needle]) {
            needle = regaIndex.Address[needle][0];
            if (hssdp) {
                // Get by Channel-Address and Datapoint
                if (regaObjects[needle].DPs && regaObjects[needle].DPs[hssdp]) {
                    needle = regaObjects[needle].DPs[hssdp];
                }
            }
        } else if (needle.match(/[a-zA-Z-]+\.[0-9A-Za-z-]+:[0-9]+\.[A-Z_]+/)) {
            // Get by full BidCos-Address
            addrArr = needle.split(".");
            if (regaIndex.Address[addrArr[1]]) {
                needle = regaObjects[regaIndex.Address[addrArr[1]]].DPs[addArr[2]];
            }
        } else {
            return false;
        }
    }
    return needle;

}

function restApi(req, res) {

    var path = req.params[0];
    var tmpArr = path.split("/");
    var command = tmpArr[0];
    var response;

    var responseType = "json";
    var status = 500;

    res.set("Access-Control-Allow-Origin", "*");

    switch(command) {
        case "getPlainValue":
            responseType = "plain";
            if (!tmpArr[1]) {
                response = "error: no datapoint given";
            }
            var dp = findDatapoint(tmpArr[1], tmpArr[2]);
            if (!dp || !datapoints[dp]) {
                response = "error: datapoint not found";
            } else {
                response = String(datapoints[dp][0]);
                status = 200;
            }
            break;
        case "get":

            if (!tmpArr[1]) {
                response = {error: "no object/datapoint given"};
            }
            var dp = findDatapoint(tmpArr[1], tmpArr[2]);
            if (!dp) {
                response = {error: "object/datapoint not found"};
            } else {
                status = 200;
                response = {id:dp};
                if (datapoints[dp]) {
                    response.value = datapoints[dp][0];
                    response.ack = datapoints[dp][2];
                    response.timestamp = datapoints[dp][1];
                    response.lastchange = datapoints[dp][3];
                }
                if (regaObjects[dp]) {
                    for (var attr in regaObjects[dp]) {
                        response[attr] = regaObjects[dp][attr];
                    }
                }
            }
            break;
        case "set":
            if (!tmpArr[1]) {
                response = {error: "object/datapoint not given"};
            }
            var dp = findDatapoint(tmpArr[1], tmpArr[2]);
            var value;
            if (req.query) {
                value = req.query.value;
            }
            if (!value) {
                response = {error: "no value given"};
            } else {
                if (value === "true") {
                    value = true;
                } else if (value === "false") {
                    value = false;
                } else if (!isNaN(value)) {
                    value = parseFloat(value);
                }
                setState(dp, value);
                status = 200;
                response = {id:dp,value:value};
            }
            break;
        case "setBulk":
            response = [];
            status = 200;
            for (var item in req.query) {
                var parts = item.split("/");
                var dp = findDatapoint(parts[0], parts[1]);
                if (dp == false) {
                    sres = {error: "datapoint "+item+" not found"};
                } else if (req.query[item] === undefined) {
                    sres = {error: "no value given for "+item};
                } else {
                    sres = {id:dp,value:req.query[item]};
                    setState(dp,req.query[item]);
                }
                response.push(sres);
            }
            break;
        case "programExecute":
            if (!tmpArr[1]) {
                response = {error: "no program given"};
            }
            var id;
            if (regaIndex.Program && regaIndex.PROGRAM.indexOf(tmpArr[1]) != -1) {
                id = tmpArr[1]
            } else if (regaIndex.Name && regaIndex.Name[tmpArr[1]]) {
                if (regaObjects[tmpArr[1]].TypeName == "PROGRAM") {
                    id = regaIndex.Name[tmpArr[1]][0];
                }
            }
            if (!id) {
                response = {error: "program not found"};
            } else {
                status = 200;
                programExecute(id);
                response = {id:id};
            }
            break;
        case "getIndex":
            response = regaIndex;
            status = 200;
            break;
        case "getObjects":
            response = regaObjects;
            status = 200;
            break;
        case "getDatapoints":
            response = datapoints;
            status = 200;
            break;
        default:
            response = {error: "command "+command+" unknown"};
    }
    switch (responseType) {
        case "json":
            res.json(response);
            break;
        case "plain":
            res.set('Content-Type', 'text/plain');
            res.send(response);
            break;

    }

}

function initWebserver() {
    if (app) {
        app.use('/', express.static(__dirname + '/www'));
        app.use('/log', express.static(__dirname + '/log'));

        // File Uploads
        app.use(express.bodyParser({uploadDir:__dirname+'/tmp'}));
        app.post('/upload', uploadParser);

        app.get('/api/*', restApi);
        app.get('/auth/*', function (req, res) {
            res.set('Content-Type', 'text/javascript');
            if (settings.authentication.enabled) {
                res.send("var socketSession='"+ authHash+"';");
            } else {
                res.send("var socketSession='nokey';");
            }
        });
    }

    if (appSsl) {
        appSsl.use('/', express.static(__dirname + '/www'));
        appSsl.use('/log', express.static(__dirname + '/log'));

        // File Uploads
        appSsl.use(express.bodyParser());
        appSsl.post('/upload', uploadParser);

        appSsl.get('/api/*', restApi);
        appSsl.get('/auth/*', function (req, res) {
            res.set('Content-Type', 'text/javascript');
            if (settings.authentication.enabledSsl) {
                res.send("var socketSession='"+ authHash+"';");
            } else {
                res.send("var socketSession='nokey';");
            }
        });
    }

    if (settings.authentication && settings.authentication.enabled) {
        logger.info("webserver     basic auth enabled");
    }

    if (server) {
        server.listen(settings.ioListenPort);
        logger.info("webserver     listening on port "+settings.ioListenPort);
        io = socketio.listen(server);
        io.set('logger', { debug: function(obj) {logger.debug("socket.io: "+obj)}, info: function(obj) {logger.debug("socket.io: "+obj)} , error: function(obj) {logger.error("socket.io: "+obj)}, warn: function(obj) {logger.warn("socket.io: "+obj)} });
        initSocketIO(io);
    }

    if (serverSsl){
        serverSsl.listen(settings.ioListenPortSsl);
        logger.info("webserver ssl listening on port "+settings.ioListenPortSsl);
        ioSsl = socketio.listen(serverSsl);
        ioSsl.set('logger', { debug: function(obj) {logger.debug("socket.io: "+obj)}, info: function(obj) {logger.debug("socket.io: "+obj)} , error: function(obj) {logger.error("socket.io: "+obj)}, warn: function(obj) {logger.warn("socket.io: "+obj)} });
        initSocketIO(ioSsl);

    }
    webserverUp = true;
    logger.info("ccu.io        ready");

    if (settings.adaptersEnabled) {
        logger.info("ccu.io        adapters enabled");
        setTimeout(startAdapters, 5000);
    }
    if (settings.scriptEngineEnabled) {
        setTimeout(startScriptEngine, 3000);
    }

}

function formatTimestamp() {
    var timestamp = new Date();
    var ts = timestamp.getFullYear() + '-' +
        ("0" + (timestamp.getMonth() + 1).toString(10)).slice(-2) + '-' +
        ("0" + (timestamp.getDate()).toString(10)).slice(-2) + ' ' +
        ("0" + (timestamp.getHours()).toString(10)).slice(-2) + ':' +
        ("0" + (timestamp.getMinutes()).toString(10)).slice(-2) + ':' +
        ("0" + (timestamp.getSeconds()).toString(10)).slice(-2);
    return ts;
}

function programExecute(id, callback) {
    logger.verbose("socket.io <-- programExecute");
    regahss.script("Write(dom.GetObject("+id+").ProgramExecute());", function (data) {
        if (callback) { callback(data); }
    });
}

function setState(id,val,ts,ack, callback) {
    logger.verbose("socket.io <-- setState id="+id+" val="+val+" ts="+ts+" ack="+ack);
    if (!ts) {
        ts = formatTimestamp();
    }


    // console.log("id="+id+" val="+val+" ts="+ts+" ack="+ack);
    // console.log("datapoints[id][0]="+datapoints[id][0]);


    // If ReGa id (0-65534)
    if (id < 65535) {
        // Bidcos or Rega?
        /*
        if (regaIndex.HSSDP.indexOf(id) != -1) {
            // Set State via xmlrpc_bin
            var name = regaObjects[id].Name;
            var parts = name.split(".");
            var iface = parts[0],
                port = homematic.ifacePorts[iface],
                channel = parts[1],
                dp = parts[2];
            // TODO BINRPC FLOAT....?
            homematic.request(port, "setValue", [channel, dp, val.toString()]);
            logger.info("BINRPC setValue "+channel+dp+" "+val);
        } else { */
            // Set State via ReGa
            var xval;
            if (typeof val == "string") {
                xval = "'" + val.replace(/'/g, '"') + "'";
            } else {
                xval = val;
            }
            var script = "Write(dom.GetObject("+id+").State("+xval+"));";

            regahss.script(script, function (data) {
                //logger.verbose("rega      <-- "+data);
                if (callback) {
                    callback(data);
                }
            });

        //}

        // Bei Update von Thermostaten den nächsten Event von SET_TEMPERATURE und CONTROL_MODE ignorieren!
        if (regaObjects[id] && regaObjects[id].Name) {

            if (regaObjects[id].Name.match(/SET_TEMPERATURE$/) || regaObjects[id].Name.match(/MANU_MODE$/) || regaObjects[id].Name.match(/SETPOINT$/)) {
                var parent = regaObjects[regaObjects[id].Parent];
                var setTemp = parent.DPs.SET_TEMPERATURE;
                var ctrlMode = parent.DPs.CONTROL_MODE;
                if (ignoreNextUpdate.indexOf(setTemp) == -1) {
                    ignoreNextUpdate.push(setTemp);
                }
                if (ignoreNextUpdate.indexOf(ctrlMode) == -1) {
                    ignoreNextUpdate.push(ctrlMode);
                }
                logger.verbose("ccu.io        ignoring next update for "+JSON.stringify(ignoreNextUpdate));
            }
        }

    }

    setDatapoint(id, val, ts, ack);


    // Virtual Datapoint
    if (id > 65535) {
        var uxTime = Math.round((new Date()).getTime() / 1000);
       // cacheLog(uxTime+" "+id+" "+JSON.stringify(val)+"\n");
        devLog(uxTime, id, val);
        if (callback) {
            callback();
        }
    }
}

function clearRegaData() {
    for (var obj in regaObjects) {
        if (parseInt(obj, 10) < 65535) {
            delete regaObjects[obj];
        }
    }
    for (var item in regaIndex.Name) {
        if (regaIndex.Name[item][0] < 65535) {
            delete regaIndex.Name[item];
        }
    }
    for (var item in regaIndex.Address) {
        if (regaIndex.Address[item][0] < 65535) {
            delete regaIndex.Address[item];
        }
    }

    var tmpArr = [];
    for (var i = 0; i < regaIndex.HSSDP.length; i++) {
        if (regaIndex.HSSDP[i] > 65535) {
            tmpArr.push(regaIndex.HSSDP[i]);
        }
    }
    regaIndex.HSSDP = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < regaIndex.ALDP.length; i++) {
        if (regaIndex.ALDP[i] > 65535) {
            tmpArr.push(regaIndex.ALDP[i]);
        }
    }
    regaIndex.ALDP = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < regaIndex.ALARMDP.length; i++) {
        if (regaIndex.ALARMDP[i] > 65535) {
            tmpArr.push(regaIndex.ALARMDP[i]);
        }
    }
    regaIndex.ALARMDP = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < regaIndex.VARDP.length; i++) {
        if (regaIndex.VARDP[i] > 65535) {
            tmpArr.push(regaIndex.VARDP[i]);
        }
    }
    regaIndex.VARDP = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < regaIndex.FAVORITE.length; i++) {
        if (regaIndex.FAVORITE[i] > 65535) {
            tmpArr.push(regaIndex.FAVORITE[i]);
        }
    }
    regaIndex.FAVORITE = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < regaIndex.ENUM_ROOMS.length; i++) {
        if (regaIndex.ENUM_ROOMS[i] > 65535) {
            tmpArr.push(regaIndex.ENUM_ROOMS[i]);
        }
    }
    regaIndex.ENUM_ROOMS = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < regaIndex.ENUM_FUNCTIONS.length; i++) {
        if (regaIndex.ENUM_FUNCTIONS[i] > 65535) {
            tmpArr.push(regaIndex.ENUM_FUNCTIONS[i]);
        }
    }
    regaIndex.ENUM_FUNCTIONS = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < regaIndex.DEVICE.length; i++) {
        if (regaIndex.DEVICE[i] > 65535) {
            tmpArr.push(regaIndex.DEVICE[i]);
        }
    }
    regaIndex.DEVICE = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < regaIndex.CHANNEL.length; i++) {
        if (regaIndex.CHANNEL[i] > 65535) {
            tmpArr.push(regaIndex.CHANNEL[i]);
        }
    }
    regaIndex.CHANNEL = tmpArr;

    var tmpArr = [];
    for (var i = 0; i < regaIndex.PROGRAM.length; i++) {
        if (regaIndex.PROGRAM[i] > 65535) {
            tmpArr.push(regaIndex.PROGRAM[i]);
        }
    }
    regaIndex.PROGRAM = tmpArr;
}


function initSocketIO(_io) {
	_io.configure(function (){
	  this.set('authorization', function (handshakeData, callback) {
        var isHttps = (serverSsl !== undefined && this.server == serverSsl);
        if ((!isHttps && settings.authentication.enabled) ||
            ( isHttps && settings.authentication.enabledSsl)) {
            if (handshakeData.query["key"] === undefined || handshakeData.query["key"] != authHash) {
                logger.info("ccu.io        authetication error on "+(isHttps ? "https from " : "http from ") + handshakeData.address.address);
                callback ("Invalid session key", false)
            } else{
                logger.info("ccu.io        authetication successful on "+(isHttps ? "https from " : "http from ") + handshakeData.address.address);
                callback(null, true);
            }
        }
        else {
           callback(null, true);
        }
	  });
	});

    _io.sockets.on('connection', function (socket) {
        socketlist.push(socket);
        var address = socket.handshake.address;
        logger.verbose("socket.io <-- " + address.address + ":" + address.port + " " + socket.transport + " connected");

        socket.on('execCmd', function (cmd, callback) {
            logger.info("ccu.io        exec "+cmd);
             childProcess.exec(cmd, callback);
        });

        socket.on('reloadData', function () {
            regaReady = false;
            clearRegaData();
            loadRegaData(0, null, true);
        });

        socket.on('restartRPC', function () {
             initRpc();
        });

        socket.on('reloadScriptEngine', function (callback) {
            if (settings.scriptEngineEnabled) {
                childScriptEngine.kill();
                setTimeout(function () {
                    startScriptEngine();
                    if (callback) {
                        callback();
                    }
                }, 1500);
            }
        });


        socket.on('readdir', function (path, callback) {
            path = __dirname+"/"+path;
            logger.info("socket.io <-- readdir "+path);
            fs.readdir(path, function (err, data) {
                if (err) {
                    callback(undefined);
                } else {
                    callback(data);
                }
            });
        });
        
        socket.on('readdir_stat', function (path, callback) {
            path = __dirname + "/" + path;
            logger.info("socket.io <-- readdir_stat " + path);

            fs.readdir(path, function(err, files) {
                var data = [];
                if (err) {
                    callback(undefined);
                }
                files.forEach(function(file) {
                    fs.stat(path + file, function(err, stats) {
                        data.push({
                            "file": file,
                            "stats": stats
                        });
                        if (data.length == files.length) {
                            callback(data);
                            logger.info(data);
                        }
                    });
                });
            });
        });

        socket.on('writeFile', function (name, obj, callback) {
            var content = JSON.stringify(obj);
            logger.verbose("socket.io <-- writeFile "+name+" "+content);
            fs.writeFile(settings.datastorePath+name, content);
            // Todo Fehler abfangen
            if (callback) { callback(); }
        });

        socket.on('writeRawFile', function (path, content, callback) {
            logger.verbose("socket.io <-- writeRawFile "+path);
            fs.writeFile(__dirname+"/"+path, content);
            // Todo Fehler abfangen
            if (callback) { callback(); }
        });

        socket.on('readFile', function (name, callback) {
            logger.verbose("socket.io <-- readFile "+name);

            fs.readFile(settings.datastorePath+name, function (err, data) {
                if (err) {
                    logger.error("ccu.io        failed loading file "+settings.datastorePath+name);
                    callback(undefined);
                } else {
                    var obj = JSON.parse(data);
                    callback(obj);
                }
            });
        });

        socket.on('readRawFile', function (name, callback) {
            logger.verbose("socket.io <-- readFile "+name);

            fs.readFile(__dirname+"/"+name, function (err, data) {
                if (err) {
                    logger.error("ccu.io        failed loading file "+__dirname+"/"+name);
                    callback(undefined);
                } else {
                    callback("\""+data+"\"");
                }
            });
        });

        socket.on('delRawFile', function (name, callback) {
            logger.info("socket.io <-- delRawFile "+name);

            fs.unlink(__dirname+"/"+name, function (err, data) {
                if (err) {
                    logger.error("ccu.io        failed deleting file "+__dirname+"/"+name);
                    callback(false);
                } else {
                    callback(true);
                }
            });
        });

        socket.on('readJsonFile', function (name, callback) {
            logger.verbose("socket.io <-- readFile "+name);

            fs.readFile(__dirname+"/"+name, function (err, data) {
                if (err) {
                    logger.error("ccu.io        failed loading file "+__dirname+"/"+name);
                    callback(undefined);
                } else {
                    callback(JSON.parse(data));
                }
            });
        });

        socket.on('getUrl', function (url, callback) {
            logger.info("ccu.io        GET "+url);
            if (url.match(/^https/)) {
                https.get(url, function(res) {
                    var body = "";
                    res.on("data", function (data) {
                        body += data;
                    });
                    res.on("end", function () {
                        callback(body);
                    });

                }).on('error', function(e) {
                        logger.error("ccu.io        GET "+url+" "+ e.message);
                    });
            } else {
                http.get(url, function(res) {
                    var body = "";
                    res.on("data", function (data) {
                        body += data;
                    });
                    res.on("end", function () {
                        callback(body);
                    });
                }).on('error', function(e) {
                        logger.error("ccu.io        GET "+url+" "+ e.message);
                    });
            }
        });

        socket.on('getSettings', function (callback) {
            callback(settings);
        });

        socket.on('getVersion', function(callback) {
            callback(settings.version);
        });

        socket.on('getDatapoints', function(callback) {
            logger.verbose("socket.io <-- getData");

            callback(datapoints);
        });

        socket.on('getObjects', function(callback) {
            logger.verbose("socket.io <-- getObjects");
            callback(regaObjects);
        });

        socket.on('getIndex', function(callback) {
            logger.verbose("socket.io <-- getIndex");
            callback(regaIndex);
        });

        socket.on('getStringtable', function(callback) {
            logger.verbose("socket.io <-- getStringtable");
            callback(stringtable);
        });

        socket.on('addStringVariable', function(name, desc, str, callback) {
            logger.verbose("socket.io <-- addStringVariable");
            regahss.addStringVariable(name, desc, str, function (id) {
                if (id) {
                    var ts = formatTimestamp();
                    datapoints[id] = [str, ts, true];
                    regaObjects[id] = {Name:name, TypeName: "VARDP", DPInfo: "DESC", ValueType: 20, ValueSubType: 11};
                    regaIndex.VARDP.push(id);
                    regaIndex.Name[id] = [13305, "VARDP", null];
                    logger.info("ccu.io        added string variable "+id+" "+name);
                }
                callback(id);
            });
        });

        function nextEnumId() {
            var id = 66000;
            while (regaObjects[id]) {
                id += 1;
            }
            return id;
        }

        socket.on('setObject', function(id, obj, callback) {
            if (!obj) {
                return;
            }
            if (obj.rooms) {
                for (var i = 0; i < obj.rooms.length; i++) {
                    var roomId;
                    if (regaIndex.ENUM_ROOMS.indexOf(obj.rooms[i]) != -1) {
                        roomId = obj.rooms[i];
                    } else if (regaIndex.Name[obj.rooms[i]] && regaIndex.Name[obj.rooms[i]][1] == "ENUM_ROOMS") {
                        roomId = regaIndex.Name[obj.rooms[i]][0];
                    } else {
                        roomId = nextEnumId();
                        regaIndex.ENUM_ROOMS.push(roomId);
                        if (!regaIndex.Name[obj.rooms[i]]) {
                            regaIndex.Name[obj.rooms[i]] = [
                                roomId, "ENUM_ROOMS", null
                            ];
                        }
                        regaObjects[roomId] = {
                            "Name": obj.rooms[i],
                            "TypeName": "ENUM_ROOMS",
                            "EnumInfo": "",
                            "Channels": []
                        };
                        logger.info("ccu.io        setObject room "+obj.rooms[i]+" created");
                    }
                    if (roomId && regaObjects[roomId].Channels.indexOf(id) == -1) {
                        regaObjects[roomId].Channels.push(id);
                    }
                }
                delete obj.rooms
            }
            if (obj.funcs) {
                for (var i = 0; i < obj.funcs.length; i++) {
                    var funcId;
                    if (regaIndex.ENUM_FUNCTIONS.indexOf(obj.funcs[i]) != -1) {
                        funcId = obj.funcs[i];
                    } else if (regaIndex.Name[obj.funcs[i]] && regaIndex.Name[obj.funcs[i]][1] == "ENUM_FUNCTIONS") {
                        funcId = regaIndex.Name[obj.funcs[i]][0];
                    } else {
                        funcId = nextEnumId();
                        regaIndex.ENUM_FUNCTIONS.push(funcId);
                        if (!regaIndex.Name[obj.funcs[i]]) {
                            regaIndex.Name[obj.funcs[i]] = [
                                funcId, "ENUM_FUNCTIONS", null
                            ];
                        }
                        regaObjects[funcId] = {
                            "Name": obj.funcs[i],
                            "TypeName": "ENUM_FUNCTIONS",
                            "EnumInfo": "",
                            "Channels": []
                        };
                        logger.info("ccu.io        setObject function "+obj.funcs[i]+" created");
                    }
                    if (funcId && regaObjects[funcId].Channels.indexOf(id) == -1) {
                        regaObjects[funcId].Channels.push(id);
                    }
                }
                delete obj.funcs;
            }
            if (obj.favs) {
                for (var i = 0; i < obj.favs.length; i++) {
                    var favId;
                    if (regaIndex.FAVORITE.indexOf(obj.favs[i]) != -1) {
                        favId = obj.favs[i];
                    } else if (regaIndex.Name[obj.favs[i]] && regaIndex.Name[obj.favs[i]][1] == "FAVORITE") {
                        favId = regaIndex.Name[obj.favs[i]][0];
                    } else {
                        favId = nextEnumId();
                        regaIndex.FAVORITE.push(favId);
                        if (!regaIndex.Name[obj.favs[i]]) {
                            regaIndex.Name[obj.favs[i]] = [
                                favId, "ENUM_FUNCTIONS", null
                            ];
                        }
                        regaObjects[favId] = {
                            "Name": obj.favs[i],
                            "TypeName": "FAVORITE",
                            "EnumInfo": "",
                            "Channels": []
                        };
                        logger.info("ccu.io        setObject favorite "+obj.favs[i]+" created");
                    }
                    if (favId && regaObjects[favId].Channels.indexOf(id) == -1) {
                        regaObjects[favId].Channels.push(id);
                    }
                }
                delete obj.favs;
            }




            if (obj.TypeName) {
                if (!regaIndex[obj.TypeName]) {
                    regaIndex[obj.TypeName] = [];
                }
                if (regaIndex[obj.TypeName].indexOf(id) == -1) {
                    regaIndex[obj.TypeName].push(id);
                }
            }

            if (obj.Name) {
                regaIndex.Name[obj.Name] = [id, obj.TypeName, obj.Parent];
            }

            if (obj.Address) {
                regaIndex.Address[obj.Address] = [id, obj.TypeName, obj.Parent];
            }
            if (obj.TypeName && obj.TypeName.match(/DP$/)) {
                if (!obj.ValueUnit) {
                    obj.ValueUnit = "";
                }
                logger.verbose("adding dp "+id);
                datapoints[id] = [obj.Value, formatTimestamp(), true];
            }

            regaObjects[id] = obj;

            if (callback) {
                callback();
            }
        });


        socket.on('setState', function(arr, callback) {
            // Todo Delay!

            //logger.info("setState"+JSON.stringify(arr));

            var id =    arr[0],
                val =   arr[1],
                ts =    arr[2],
                ack =   arr[3];

            if (typeof id == "string") {
                if (regaIndex.Name[id]) {
                    id = regaIndex.Name[id][0];
                } else if (regaIndex.Address[id]) {
                    id = regaIndex.Address[id][0];
                }
            }

            //logger.info("setState"+JSON.stringify(arr));

            setState(id,val,ts,ack, callback);

        });

        socket.on('programExecute', programExecute);

        socket.on('runScript', function(script, callback) {
            logger.verbose("socket.io <-- script");
            regahss.script(script, function (data) {
                if (callback) { callback(data); }
            });
        });

        socket.on('disconnect', function () {
            var address = socket.handshake.address;
            logger.verbose("socket.io <-- " + address.address + ":" + address.port + " " + socket.transport + " disconnected");
            socketlist.splice(socketlist.indexOf(socket), 1);
        });

        socket.on('close', function () {
            var address = socket.handshake.address;
            logger.verbose("socket.io <-- " + address.address + ":" + address.port + " " + socket.transport + " closed");
            socketlist.splice(socketlist.indexOf(socket), 1);
        });
    });

}

function startScriptEngine() {
    var path = __dirname + "/script-engine.js";
    logger.info("ccu.io        starting script-engine");
    childScriptEngine = childProcess.fork(path);
}

function startAdapters () {
    if (!settings.adapters) {
        return false;
    }
    for (adapter in settings.adapters) {
        if (!settings.adapters[adapter].enabled) {
            continue;
        }
        //logger.info("ccu.io        found adapter "+adapter);
        var mode = settings.adapters[adapter].mode;
        var period = settings.adapters[adapter].period * 60000;

        var path = __dirname + "/adapter/"+adapter+"/"+adapter+".js";


        switch (mode) {
            case "periodical":
                startAdapterPeriod(path, period);
                break;

            default:
                logger.info("ccu.io        starting adapter "+path);
                children.push(childProcess.fork(path));
        }
    }
}

function startAdapterPeriod (adapter, interval) {
   setInterval(function () {
        logger.info("ccu.io        starting adapter "+adapter+" (interval="+interval+"ms)");
        childProcess.fork(adapter);
    }, interval);
    logger.info("ccu.io        starting adapter "+adapter+" (interval="+interval+"ms)");
    childProcess.fork(adapter);
}

process.on('SIGINT', function () {
    stop();
});

process.on('SIGTERM', function () {
    stop();
});

function stop() {
    try {
        socketlist.forEach(function(socket) {
            logger.info("socket.io --> disconnecting socket");
            socket.disconnect();
        });

        if (io && io.server) {
            logger.info("ccu.io        closing http server");
            io.server.close();
            io.server = undefined;
        }
        if (ioSsl && ioSsl.server) {
            logger.info("ccu.io        closing https server");
            ioSsl.server.close();
            ioSsl.server = undefined;
        }

        if (childScriptEngine) {
            logger.info("ccu.io        killing script-engine");
            childScriptEngine.kill();
        }


        logger.info("ccu.io        killing child processes");
        for (var i = 0; i < children.length; i++) {
            children[i].kill();
        }
    } catch (e) {
        logger.error("ccu.io        something went wrong "+e)
    }


    setTimeout(quit, 500);
}

var quitCounter = 0;

function quit() {
    logger.verbose("ccu.io        quit");
    if (regahss.pendingRequests > 0) {
        quitCounter += 1;
        if (quitCounter > 20) {
            logger.verbose("rega          waited too long ... killing process");
            setTimeout(function () {
                process.exit(0);
            }, 250);
        }
        logger.verbose("rega          waiting for pending ReGa request...");
        setTimeout(quit, 500);

    } else {
        logger.info("ccu.io uptime "+stats.uptime());
        logger.info("ccu.io        terminating");
        setTimeout(function () {
            process.exit(0);
        }, 250);
    }
}

function cacheLog(str) {
    devlogCache.push(str);
}

var logMoving = false;

function writeLog() {

    if (logMoving) {
        setTimeout(writeLog, 250);
        return false;
    }

    var tmp = devlogCache;
    devlogCache = [];

    var l = tmp.length;
    logger.verbose("ccu.io        writing "+l+" lines to "+settings.logging.file);

    var file = __dirname+"/log/"+settings.logging.file;

    fs.appendFile(file, tmp.join(""), function (err) {
        if (err) {
            logger.error("ccu.io        writing to "+settings.logging.file + " error: "+JSON.stringify(err));
        }
    });

}

function moveLog() {
    logMoving = true;
    setTimeout(moveLog, 86400000);
    var ts = (new Date()).getTime() - 3600000;
    ts = new Date(ts);

    logger.info("ccu.io        moving Logfile");

    var timestamp = ts.getFullYear() + '-' +
        ("0" + (ts.getMonth() + 1).toString(10)).slice(-2) + '-' +
        ("0" + (ts.getDate()).toString(10)).slice(-2);

    fs.rename(__dirname+"/log/"+settings.logging.file, __dirname+"/log/"+settings.logging.file+"."+timestamp, function() {
        logMoving = false;
    });

}

function devLog(ts, id, val) {

    if (typeof val === "string") {
        if (val === "true") { val = true; }
        if (val === "false") { val = false; }
        if (!isNaN(val)) {
            val = parseFloat(val);
        }
    }
    cacheLog(ts+" "+id+" "+JSON.stringify(val)+"\n");
}
