"use strict";

var _platforms = require("../platforms");

var babel = require("babel-core");
var watch = require("glob-watcher");
var path = require("path");
var fs = require("fs");
var fsExtra = require("fs-extra");

var utils = require("../utils");

var platforms = [_platforms.ios, _platforms.android, _platforms.node];

var scriptsDir = "app/js/";

function log(msg) {
    var date = new Date();

    var hour = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var milliseconds = date.getMilliseconds();

    console.log('[' + (hour < 10 ? '0' + hour : hour) + ':' + (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds) + '.' + ('00' + milliseconds).slice(-3) + '] ' + msg);
}

function transpile(sourceFile) {
    var relativeDir = path.dirname(sourceFile.replace(scriptsDir, ""));
    var scriptName = path.basename(sourceFile);
    babel.transformFile(sourceFile, { presets: ["babel-preset-es2015"].map(require.resolve) }, function (err, result) {
        if (err) {
            console.log(err.message);
            console.log(err.codeFrame);
        } else {
            platforms.forEach(function (platform) {
                var jsDir = platform.mapAssetPath("js");
                var destDir = path.join(jsDir, relativeDir);
                var destFile = path.join(destDir, scriptName);
                try {
                    fsExtra.mkdirpSync(destDir);
                    fs.writeFileSync(destFile, result.code);
                } catch (error) {
                    console.log(error.message);
                    console.log(error.stack);
                }
            });

            log(sourceFile + " compiled!");
        }
    });
}

function watchScripts() {
    var watcher = watch(scriptsDir + "**/*.js");

    watcher.on("add", function (path) {
        transpile(path);
    });

    watcher.on("change", function (path) {
        transpile(path);
    });
}

module.exports = function watch() {
    if (!utils.isApp()) {
        console.error("Please run this command on app root directory");
        return;
    }

    //buildRasterImages();
    //buildSvgImages();
    watchScripts();
};