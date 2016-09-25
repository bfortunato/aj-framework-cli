"use strict";

const Git = require("nodegit");
const fs = require("fs");
const fsExtra = require("fs-extra");

module.exports = function init(path) {
    console.log("Downloading bootstrapper project...");

    Git.Clone("https://github.com/bfortunato/aj-framework", path)
        .then((repo) => {
            console.log("Project downloaded. Initializing...");

            fs.closeSync(fs.openSync(path + "/.ajapp", 'w'));

            return fsExtra.remove(path + "/.git");
    }).then(() => {
        console.log("Done! Project created at " + path);
    }).catch(e => {
        console.error(e);
    });

};