"use strict";

var fs = require("fs");

module.exports = {
    readText: function readText(path, cb) {
        path = ".storage/" + path;
        fs.readFile(path, "utf8", function (err, data) {
            if (err) {
                cb(true, err);
            } else {
                cb(false, data);
            }
        });
    },

    read: function read(path, cb) {
        path = ".storage/" + path;
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

    writeText: function writeText(path, contents, cb) {
        path = ".storage/" + path;
        fs.stat(".storage", function (err, stat) {
            if (err || !stat.isDirectory()) {
                fs.mkdirSync(".storage");
            }

            fs.writeFile(path, contents, "utf8", function (err, data) {
                if (err) {
                    cb(true, err);
                } else {
                    cb(false, "OK");
                }
            });
        });
    },

    write: function write(path, bytes, cb) {
        path = ".storage/" + path;
        fs.stat(".storage", function (stat, err) {
            if (!stat.isDirectory()) {
                fs.mkdirSync(".storage");
            }

            fs.writeFile(path, bytes, function (err, data) {
                if (err) {
                    cb(true, err);
                } else {
                    cb(false, data);
                }
            });
        });
    },

    delete: function _delete(path, cb) {
        path = ".storage/" + path;
        fs.unlink(".storage", function (err, stat) {
            if (err) {
                cb(true, err);
            } else {
                cb(false, "OK");
            }
        });
    },

    exists: function exists(path, cb) {
        path = ".storage/" + path;
        fs.stat(".storage", function (err, stat) {
            if (err) {
                cb(false, false);
            } else {
                cb(false, stat.isFile() || stat.isDirectory());
            }
        });
    }

};