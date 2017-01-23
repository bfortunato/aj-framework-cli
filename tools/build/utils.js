"use strict";

var fs = require("fs");

exports.isApp = function () {
    var sourceDir = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";

    try {
        if (sourceDir) {
            fs.statSync(sourceDir + "/" + ".ajapp");
        } else {
            fs.statSync(".ajapp");
        }
        return true;
    } catch (e) {
        return false;
    }
};