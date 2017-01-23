"use strict";

var _platforms = require("../platforms");

var PLATFORMS = _interopRequireWildcard(_platforms);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var glob = require("glob");
var path = require("path");
var fs = require("fs");
var fsExtra = require("fs-extra");
var pn = require("pn/fs");

var utils = require("../utils");

var ALL_PLATFORMS = [];
for (var k in PLATFORMS) {
    ALL_PLATFORMS.push(PLATFORMS[k]);
}

Array.prototype.contains = function (el) {
    return this.indexOf(el) != -1;
};

var ignore = ["node_modules/", "build/"];

function doUpdate(platforms, sourceDir, force) {
    if (!utils.isApp(sourceDir)) {
        console.error("Source dir must be an AJ project");
        process.exit(1);
        return;
    }

    console.log("Scanning source dir " + sourceDir);

    glob(sourceDir + "/**/*.*", function (error, files) {
        files.forEach(function (sourceFile) {
            var relativeDir = path.dirname(sourceFile.replace(sourceDir, ""));
            var fileName = path.basename(sourceFile);
            var destDir = path.join("./", relativeDir);
            var destFile = path.join(destDir, fileName);
            try {
                //fsExtra.mkdirpSync(destDir);
                //fs.writeFileSync(destFile, result.code);

                console.log("[UPDATED] " + sourceFile + " -> " + destFile);
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