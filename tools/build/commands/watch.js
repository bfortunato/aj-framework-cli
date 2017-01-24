"use strict";

var _platforms2 = require("../platforms");

var PLATFORMS = _interopRequireWildcard(_platforms2);

var _commands = require("../commands");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var babel = require("babel-core");
var watch = require("glob-watcher");
var path = require("path");
var fs = require("fs");
var fsExtra = require("fs-extra");
var player = require("play-sound")();

var utils = require("../utils");

var ALL_PLATFORMS = [];
for (var k in PLATFORMS) {
    ALL_PLATFORMS.push(PLATFORMS[k]);
}

var scriptsDir = "app/js/";

function log(msg) {
    var date = new Date();

    var hour = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var milliseconds = date.getMilliseconds();

    console.log('[' + (hour < 10 ? '0' + hour : hour) + ':' + (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds) + '.' + ('00' + milliseconds).slice(-3) + '] ' + msg);
}

function notify(type) {
    player.play(__dirname + "/../../resources/" + type + ".mp3", function (err) {});
}

function transpile(sourceFile, platforms) {
    var relativeDir = path.dirname(sourceFile.replace(scriptsDir, ""));
    var scriptName = path.basename(sourceFile);
    var moduleName = path.join(relativeDir, scriptName);
    moduleName = moduleName.replace(".jsx", ".js");

    function getCombined(combinedList, moduleName) {
        for (var i = 0; i < combinedList.length; i++) {
            if (combinedList[i].module == moduleName) {
                return combinedList[i];
            }
        }

        return null;
    }

    function touchCombined(combinedList, moduleName) {
        var combined = getCombined(combinedList, moduleName);
        if (combined != null) {
            combined.dirty = true;
        }
    }

    babel.transformFile(sourceFile, { presets: ["babel-preset-es2015", "babel-preset-react"].map(require.resolve) }, function (err, result) {
        if (err) {
            notify("error");
            console.log(err.message);
            console.log(err.codeFrame);
        } else {
            platforms.forEach(function (platform) {
                if (platform.combineScripts) {
                    if (!platform.combined) {
                        platform.combined = [];
                    }

                    try {
                        touchCombined(platform.combined, moduleName);
                        (0, _commands.build)([platform.name], ["scripts"], false, function () {
                            return notify("build");
                        });
                    } catch (error) {
                        console.log(error.message);
                        console.log(error.stack);
                    }
                } else {
                    var jsDir = platform.mapAssetPath("js");
                    var destDir = path.join(jsDir, relativeDir);
                    var destFile = path.join(destDir, scriptName);
                    destFile = destFile.replace(".jsx", ".js");
                    try {
                        fsExtra.mkdirpSync(destDir);
                        fs.writeFileSync(destFile, result.code);
                    } catch (error) {
                        console.log(error.message);
                        console.log(error.stack);
                    }
                }
            });

            log("[COMPILED] " + sourceFile);

            notify("watch");
        }
    });
}

function watchScripts(_platforms) {
    var selectedPlatforms = [];

    var all = !_platforms || _platforms.contains("all");

    if (all) {
        ALL_PLATFORMS.forEach(function (platform) {
            return selectedPlatforms.push(platform);
        });
    } else {
        _platforms.forEach(function (pname) {
            var platform = PLATFORMS[pname];
            if (!platform) {
                console.log("Unknown platform: " + pname);
                process.exit(1);
                return;
            } else {
                selectedPlatforms.push(platform);
            }
        });
    }

    var watcher = watch(scriptsDir + "**/*.{js,jsx}");

    watcher.on("add", function (path) {
        transpile(path, selectedPlatforms);
    });

    watcher.on("change", function (path) {
        transpile(path, selectedPlatforms);
    });
}

module.exports = function watch(platforms) {
    if (!utils.isApp()) {
        console.error("Please run this command on app root directory");
        return;
    }

    //buildRasterImages();
    //buildSvgImages();
    watchScripts(platforms);

    console.log("Looking for changes...");
};