"use strict";

const fs = require("fs");

exports.isApp = function () {
    try {
        fs.statSync(".ajapp");
        return true;
    } catch (e) {
        return false;
    }
};