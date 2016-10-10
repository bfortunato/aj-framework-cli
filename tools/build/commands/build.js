"use strict";

const babel = require("babel-core");
const glob = require("glob");
const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
const easyimage = require("easyimage");
const pn = require("pn/fs");

const utils = require("../utils");

import { android, ios, node } from "../platforms";

var platforms = [ios, android, node];

function buildAssets() {
    var assetsDir = "app/assets/";
    glob(assetsDir + "**/*", function (error, files) {
        files.forEach(function (sourceFile) {
            var relativeDir = path.dirname(sourceFile.replace(assetsDir, ""));
            var fileName = path.basename(sourceFile);
            platforms.forEach(function (platform) {
                var platformDir = platform.mapAssetPath("");
                var destDir = path.join(platformDir, relativeDir);
                var destFile = path.join(destDir, fileName);
                try {
                    fsExtra.copySync(sourceFile, destFile);

                    console.log(sourceFile + " == " + destFile);
                } catch (error) {
                    console.log(error.message);
                    console.log(error.stack);
                    process.exit(1);
                }
            });
        });
    });
}

function buildRasterImages() {
    var sourceDir = "app/resources/images/";
    glob(sourceDir + "**/*[.png|.jpg]", function (err, files) {
        files.forEach(function (sourcePath) {
            if (sourcePath.indexOf("@") == -1) {
                //already converted
                easyimage.info(sourcePath).then(function (info) {
                    var ext = path.extname(sourcePath).toLowerCase();
                    var destDir = path.dirname(sourcePath.replace(sourceDir, "")) + "/";
                    console.log("Working on " + sourcePath);
                    var imageName = path.basename(sourcePath, ext);
                    var ratios = android.ratios;
                    platforms.forEach(platform => {
                        for (var i = 0; i < ratios.length; i++) {
                            (function (m) {
                                var factor = m / 4;
                                if (platform.ratios.indexOf(m) != -1) {
                                    var dest = platform.mapImagePath(destDir, imageName, ".png", m);
                                    if (dest == null) {
                                        return;
                                    }
                                    if (!fs.existsSync(path.dirname(dest))) {
                                        fs.mkdirSync(path.dirname(dest));
                                    }

                                    console.log("Resizing " + imageName + " with factor " + factor);
                                    easyimage.resize({
                                        src: sourcePath,
                                        dst: dest,
                                        width: info.width * factor,
                                        height: info.height * factor
                                    }).then(() => console.log("Resized " + dest + " " + JSON.stringify({
                                        width: info.width * factor,
                                        height: info.height * factor
                                    }))).catch(err => {
                                        console.log("Error resizing image " + sourcePath + " with factor " + factor + "(w=" + info.width * factor + ", h=" + info.height * factor + ")" + err);
                                    });
                                }
                            })(ratios[i]);
                        }

                        if (platform.afterImage) {
                            platform.afterImage(destDir, imageName, ".png");
                        }
                    });
                });
            }
        });
    });
}

function buildSvgImages() {
    var sourceDir = "app/resources/images/";
    glob(sourceDir + "**/*.svg", function (err, files) {
        files.forEach(function (sourcePath) {
            console.log("Working on " + sourcePath);
            if (sourcePath.indexOf("@") == -1) {
                //already converted
                easyimage.info(sourcePath).then(function (info) {
                    var ext = path.extname(sourcePath).toLowerCase();
                    var relativeDir = path.dirname(sourcePath.replace(sourceDir, "")) + "/";
                    var imageName = path.basename(sourcePath, ext);
                    var ratios = android.ratios;
                    for (var i = 0; i < ratios.length; i++) {
                        (function (m) {
                            var factor = m;
                            pn.readFile(sourcePath).then(buffer => svg2png(buffer, { width: parseInt(info.width * factor), height: parseInt(info.height * factor) })).then(buffer => {
                                platforms.forEach(platform => {
                                    if (platform.ratios.indexOf(m) != -1) {
                                        var dest = platform.mapImagePath(relativeDir, imageName, ".png", m);
                                        if (dest == null) {
                                            return;
                                        }

                                        if (!fs.existsSync(path.dirname(dest))) {
                                            fs.mkdirSync(path.dirname(dest));
                                        }
                                        fs.writeFile(dest, buffer);

                                        console.log(dest + " " + JSON.stringify({
                                            width: info.width * factor,
                                            height: info.height * factor
                                        }));
                                    }

                                    if (platform.afterImage) {
                                        platform.afterImage(relativeDir, imageName, ".png");
                                    }
                                });
                            }).catch(e => {
                                console.log(e.message);console.error(e.stack);
                            });
                        })(ratios[i]);
                    }
                });
            }
        });
    });
}

var scriptsDir = "app/js/";

var noCompileList = [scriptsDir + "framework/underscore.js", scriptsDir + "framework/moment.js", scriptsDir + "framework/polyfill.js"];

function buildScripts() {
    glob(scriptsDir + "**/*.js", function (error, files) {
        files.forEach(function (sourceFile) {
            if (noCompileList.indexOf(sourceFile) != -1) {
                var relativeDir = path.dirname(sourceFile.replace(scriptsDir, ""));
                var scriptName = path.basename(sourceFile);
                platforms.forEach(function (platform) {
                    var jsDir = platform.mapAssetPath("js");
                    var destDir = path.join(jsDir, relativeDir);
                    var destFile = path.join(destDir, scriptName);
                    try {
                        fsExtra.copySync(sourceFile, destFile);

                        console.log(sourceFile + " == " + destFile);
                    } catch (error) {
                        console.log(error.message);
                        console.log(error.stack);
                        process.exit(1);
                    }
                });
                return;
            }

            var relativeDir = path.dirname(sourceFile.replace(scriptsDir, ""));
            var scriptName = path.basename(sourceFile);
            babel.transformFile(sourceFile, { presets: ["babel-preset-es2015"].map(require.resolve) }, function (err, result) {
                if (err) {
                    console.log(err.message);
                    console.log(err.codeFrame);
                    process.exit(1);
                } else {
                    platforms.forEach(function (platform) {
                        var jsDir = platform.mapAssetPath("js");
                        var destDir = path.join(jsDir, relativeDir);
                        var destFile = path.join(destDir, scriptName);
                        try {
                            fsExtra.mkdirpSync(destDir);
                            fs.writeFileSync(destFile, result.code);

                            console.log(sourceFile + " => " + destFile);
                        } catch (error) {
                            console.log(error.message);
                            console.log(error.stack);
                            process.exit(1);
                        }
                    });
                }
            });
        });
    });
}

module.exports = function build() {
    if (!utils.isApp()) {
        console.error("Please run this command on app root directory");
        return;
    }

    buildAssets();
    buildRasterImages();
    //buildSvgImages();
    buildScripts();
};