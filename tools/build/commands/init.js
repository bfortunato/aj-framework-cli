"use strict";

var exec = require("child_process").exec;
var fs = require("fs");
var fsExtra = require("fs-extra");

module.exports = function init(path) {
    console.log("Downloading bootstrapper project...");

    exec("git clone https://github.com/bfortunato/aj-framework " + path, function () {
        console.log("Project downloaded. Initializing...");

        fs.closeSync(fs.openSync(path + "/.ajapp", 'w'));

        fsExtra.removeSync(path + "/.git");

        console.log("Done! Project created at " + path);
    });
};