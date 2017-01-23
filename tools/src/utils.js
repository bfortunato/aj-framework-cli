"use strict";

const fs = require("fs");

exports.isApp = function(sourceDir = "") {
    try {
        if (sourceDir) {
            fs.statSync(sourceDir + "/" + ".ajapp");
        } else {
            fs.statSync(".ajapp");
        }
        return true;
    } catch (e) {
        return false;
    }
};