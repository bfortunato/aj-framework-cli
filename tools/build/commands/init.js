"use strict";

var Git = require("nodegit");
var fs = require("fs");
var fsExtra = require("fs-extra");

module.exports = function init(path) {
    console.log("Downloading bootstrapper project...");

    Git.Clone("https://github.com/bfortunato/aj-framework", path).then(function (repo) {
        console.log("Project downloaded. Initializing...");

        fs.closeSync(fs.openSync(path + "/.ajapp", 'w'));

        return fsExtra.remove(path + "/.git");
    }).then(function () {
        console.log("Done! Project created at " + path);
    }).catch(function (e) {
        console.error(e);
    });
};