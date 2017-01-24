"use strict";

var glob = require("glob");
var path = require("path");
var fs = require("fs");
var fsExtra = require("fs-extra");
var pn = require("pn/fs");
var utils = require("../utils");
var diff = require('diff');
var readline = require('readline-sync');
var chalk = require("chalk");
var isbinaryfile = require("isbinaryfile");
var exec = require("child_process").exec;

var TMP_DIR = "__aj_update";

Array.prototype.contains = function (el) {
    return this.indexOf(el) != -1;
};

function getFromGitHub(cb) {
    console.log("Downloading updated files...");

    exec("git clone https://github.com/bfortunato/aj-framework " + TMP_DIR, function (error, stdout, stderr) {
        console.log(stdout);

        if (error) {
            console.error(stderr);
        } else {
            fs.closeSync(fs.openSync(path + "/.ajapp", 'w'));
            fsExtra.removeSync(path + "/.git");
            console.log("Updated files downloaded!");

            cb(TMP_DIR);
        }
    });
}

function confirm(msg, cb, force) {
    if (!force) {
        var answer = readline.question(msg + " [y,n]: ");
        if (answer == "y") {
            cb();
        } else if (answer == "q") {
            process.exit(0);
        } else if (answer != "n") {
            confirm(msg, cb);
        }
    } else {
        cb();
    }
}

function copy(sourceFile, destDir, destFile) {
    if (!fs.existsSync(destDir)) {
        fsExtra.mkdirpSync(destDir);
    }
    fsExtra.copySync(sourceFile, destFile);
}

function doUpdate(sourceDir, ignoreAdded, simulate, force) {
    if (!utils.isApp(sourceDir)) {
        console.error("Source dir must be an AJ project");
        process.exit(1);
        return;
    }

    console.log("Scanning source dir " + sourceDir);

    glob(sourceDir + "/**/*.*", {
        ignore: [sourceDir + "/**/node_modules/**", sourceDir + "/**/build/**"]
    }, function (error, files) {
        files.forEach(function (sourceFile) {
            console.log("Working on " + sourceFile);

            var relativeDir = path.dirname(sourceFile.replace(sourceDir, ""));
            var fileName = path.basename(sourceFile);
            var destDir = path.join("./", relativeDir);
            var destFile = path.join(destDir, fileName);
            try {
                var sourceStat = fs.statSync(sourceFile);
                if (!sourceStat.isDirectory()) {
                    var destStat = null;
                    try {
                        destStat = fs.statSync(destFile);
                    } catch (e) {}
                    if (destStat != null) {
                        if (isbinaryfile.sync(sourceFile)) {
                            if (sourceStat.size != destStat.size) {
                                confirm("Desination file " + destFile + " is different from source. Do you want to update?", function () {
                                    if (!simulate) {
                                        copy(sourceFile, destDir, destFile);
                                    }
                                    console.log("[UPDATED] " + destFile);
                                }, force);
                            }
                        } else {
                            var source = fs.readFileSync(sourceFile);
                            var dest = fs.readFileSync(destFile);
                            var diffResult = diff.diffLines(dest.toString(), source.toString());
                            var isDifferent = false;
                            for (var i = 0; i < diffResult.length; i++) {
                                var part = diffResult[i];
                                if (part.added || part.removed) {
                                    isDifferent = true;
                                    break;
                                }
                            }

                            if (isDifferent) {
                                console.log("Differences between " + sourceFile + " and " + destFile + ":");

                                diffResult.forEach(function (part) {
                                    if (part.added) {
                                        process.stdout.write(chalk.green(part.value));
                                    } else if (part.removed) {
                                        process.stdout.write(chalk.red(part.value));
                                    } else {
                                        process.stdout.write(part.value);
                                    }
                                });

                                console.log();

                                confirm("Desination file " + destFile + " is different from source. Do you want to update?", function () {
                                    if (!simulate) {
                                        copy(sourceFile, destDir, destFile);
                                    }
                                    console.log("[UPDATED] " + destFile);
                                }, force);
                            }
                        }
                    } else {
                        if (!ignoreAdded) {
                            confirm("Desination file " + destFile + " not exists. Do you want to create?", function () {
                                if (!simulate) {
                                    copy(sourceFile, destDir, destFile);
                                }
                                console.log("[CREATED] " + destFile);
                            }, force);
                        }
                    }
                }
            } catch (error) {
                console.log(error.message);
                console.log(error.stack);
            }
        });
    });
};

module.exports = function update(sourceDir, ignoreAdded, simulate, force) {
    if (!utils.isApp()) {
        console.error("Please run this command on app root directory");
        return;
    }

    if (!sourceDir) {
        getFromGitHub(function (dir) {
            doUpdate(dir, ignoreAdded, simulate, force);
        });
    } else {
        doUpdate(sourceDir, ignoreAdded, simulate, force);
    }
};