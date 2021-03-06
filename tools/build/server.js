"use strict";

var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var ip = require("ip");
var process = require("process");

var logger = {
    i: function i(message) {
        if (arguments.length > 1) {
            message = Array.prototype.join.call(arguments, " ");
        }
        console.log(message);
    },

    w: function w(message) {
        if (arguments.length > 1) {
            message = Array.prototype.join.call(arguments, " ");
        }
        console.warn(message);
    },

    e: function e(message) {
        if (arguments.length > 1) {
            message = Array.prototype.join.call(arguments, " ");
        }
        console.error(message);
    }
};

var platform = {
    engine: "node",
    device: "unknown"
};

var async = function async(action) {
    //nodeasync.parallel([action], function() { console.log("async complete"); })
    setTimeout(action, 0);
};

global.logger = logger;
global.platform = platform;
global.__httpClient = require("./server/http");
global.__assetsManager = require("./server/assets");
global.__storageManager = require("./server/storage");
global.__buffersManager = require("./server/buffers");

global.__notify = function (notification, componentId, data) {
    io.emit("notify", notification, componentId, data);
};

global.async = async;

var main = require("./../app/js/main.js");
var aj = require("./../app/js/aj/index.js");

http.listen(3000, function () {
    console.log("AJ debug server listening on " + ip.address() + ":3000");

    var appPath = process.argv[2];

    io.on("connection", function (socket) {
        socket.emit("device", function (json) {
            var result = JSON.parse(json);

            global.device = {
                getScale: function getScale() {
                    return result.scale;
                },
                getHeight: function getHeight() {
                    return result.height;
                },
                getWidth: function getWidth() {
                    return result.width;
                }
            };

            aj.createRuntime({ appPath: appPath, socket: socket });

            main.main();
        });

        socket.on("disconnect", function () {
            process.exit(0);
        });
    });
});