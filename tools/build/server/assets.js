"use strict";

var fs = require("fs");

module.exports = {
    load: function load(path, cb) {
        path = ".work/" + path;
        fs.readFile(path, function (err, data) {
            if (err) {
                cb(true, err);
            } else {
                __buffersManager.create(data.toString("base64")).then(function (id) {
                    cb(false, id);
                }).catch(function (e) {
                    cb(true, e);
                });
            }
        });
    },

    exists: function exists(path, cb) {
        cb(false, true);
    }
};