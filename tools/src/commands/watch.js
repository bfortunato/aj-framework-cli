"use strict";

const watch = require("glob-watcher");
const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
const player = require("play-sound")();
const {buildScripts} = require("./build");
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

    buildScripts(selectedPlatforms, false, null, true);
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