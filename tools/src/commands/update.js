"use strict";

const glob = require("glob");
const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
const pn = require("pn/fs");

const utils = require("../utils");

import * as PLATFORMS from "../platforms"
const ALL_PLATFORMS = [];
for (var k in PLATFORMS) {
    ALL_PLATFORMS.push(PLATFORMS[k]);
}

Array.prototype.contains = function(el) {
    return this.indexOf(el) != -1;
};

const ignore = [
    "node_modules/",
    "build/"
]

function doUpdate(platforms, sourceDir, force) {
    if (!utils.isApp(sourceDir)) {
        console.error("Source dir must be an AJ project");
        process.exit(1);
        return;
    }

    console.log("Scanning source dir " + sourceDir)

    glob(sourceDir + "/**/*.*", function (error, files) {
        files.forEach(function (sourceFile) {
            var relativeDir = path.dirname(sourceFile.replace(sourceDir, ""));
            var fileName = path.basename(sourceFile);
            var destDir = path.join("./", relativeDir);
            var destFile = path.join(destDir, fileName);
            try {
                //fsExtra.mkdirpSync(destDir);
                //fs.writeFileSync(destFile, result.code);

                console.log("[UPDATED] " + sourceFile  + " -> " + destFile);
            } catch (error) {
                console.log(error.message);
                console.log(error.stack);
            }
        });
    });
};

module.exports = function update(sourceDir, force) {
    if (!utils.isApp()) {
        console.error("Please run this command on app root directory");
        return;
    }

    doUpdate(sourceDir, force);
};