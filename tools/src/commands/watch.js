"use strict";

const babel = require("babel-core");
const watch = require("glob-watcher");
const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");

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

function transpile(sourceFile, platforms) {
    var relativeDir = path.dirname(sourceFile.replace(scriptsDir, ""));
    var scriptName = path.basename(sourceFile);
    babel.transformFile(sourceFile, {presets: ["babel-preset-es2015", "babel-preset-react"].map(require.resolve)}, function(err, result) {
        if (err) {
            console.log(err.message);
            console.log(err.codeFrame);
        } else {
            platforms.forEach(function(platform) {
                if (platform.combineScripts) {
                    try {
                        build([platform.name], ["scripts"]);
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