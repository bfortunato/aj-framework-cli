"use strict";

var fs = require("fs");

exports.isApp = function () {
    try {
        fs.statSync(".ajapp");
        return true;
    } catch (e) {
        return false;
    }
};