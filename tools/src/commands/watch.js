"use strict";

const babel = require("babel-core");
const watch = require("glob-watcher");
const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
const player = require("play-sound")();

const utils = require("../utils");

import * as PLATFORMS from "../platforms"
const ALL_PLATFORMS = [];
for (var k in PLATFORMS) {
    ALL_PLATFORMS.push(PLATFORMS[k]);
}
import { build } from "../commands"

var scriptsDir = "app/js/";

function log(msg) {
    var date = new Date();

    var hour = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var milliseconds = date.getMilliseconds();

    console.log('[' +
        ((hour < 10) ? '0' + hour : hour) +
        ':' +
        ((minutes < 10) ? '0' + minutes : minutes) +
        ':' +
        ((seconds < 10) ? '0' + seconds : seconds) +
        '.' +
        ('00' + milliseconds).slice(-3) +
        '] ' + msg);

}

function notify(type) {
    player.play(__dirname + "/../../resources/" + type + ".mp3", function(err) {})
}

function transpile(sourceFile, platforms) {
    console.log("before")
    console.log(sourceFile)
    sourceFile = sourceFile.replace(/\\/g, "/")
    console.log("after")
    console.log(sourceFile)

    var relativeDir = path.posix.dirname(sourceFile.replace(scriptsDir, ""));
    var scriptName = path.posix.basename(sourceFile);
    var moduleName = path.posix.join(relativeDir, scriptName);
    moduleName = moduleName.replace(".jsx", ".js");

    function getCombined(combinedList, moduleName) {
        for (var i = 0; i < combinedList.length; i++) {
            if (combinedList[i].module == moduleName) {
                return combinedList[i]
            }
        }

        return null;
    }

    function touchCombined(combinedList, moduleName) {
        var combined = getCombined(combinedList, moduleName)
        if (combined != null) {
            combined.dirty = true
        }
    }

    babel.transformFile(sourceFile, {presets: ["babel-preset-es2015", "babel-preset-react"].map(require.resolve)}, function(err, result) {
        if (err) {
            notify("error")
            console.log(err.message);
            console.log(err.codeFrame);
        } else {
            platforms.forEach(function(platform) {
                if (platform.combineScripts) {
                    if (!platform.combined) {
                        platform.combined = []
                    }

                    try {
                        touchCombined(platform.combined, moduleName);
                        build([platform.name], ["scripts"], false, () => notify("build"));
                    } catch (error) {
                        console.log(error.message);
                        console.log(error.stack);
                    }
                } else {
                    var jsDir = platform.mapAssetPath("js");
                    var destDir = path.posix.join(jsDir, relativeDir);
                    var destFile = path.posix.join(destDir, scriptName);
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

            notify("watch")
        }
    });
}

function watchScripts(_platforms) {
    let selectedPlatforms = [];

    let all = !_platforms || _platforms.contains("all");

    if (all) {
        ALL_PLATFORMS.forEach(platform => selectedPlatforms.push(platform))
    } else {
        _platforms.forEach(pname => {
            let platform = PLATFORMS[pname];
            if (!platform) {
                console.log("Unknown platform: " + pname);
                process.exit(1);
                return;
            } else {
                selectedPlatforms.push(platform);
            }
        })
    }

    var watcher = watch(scriptsDir + "**/*.{js,jsx}");

    watcher.on("add", function(path) {
         transpile(path, selectedPlatforms);
    });

    watcher.on("change", function(path) {
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