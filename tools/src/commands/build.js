"use strict";

const babel = require("babel-core");
const glob = require("glob");
const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
const pn = require("pn/fs");
const sharp = require("sharp");

const utils = require("../utils");

import * as PLATFORMS from "../platforms"
const ALL_PLATFORMS = [];
for (var k in PLATFORMS) {
    ALL_PLATFORMS.push(PLATFORMS[k]);
}

Array.prototype.contains = function(el) {
    return this.indexOf(el) != -1;
};

function buildAssets(platforms) {
    var assetsDir = "app/assets/";
    glob(assetsDir + "**/*", function(error, files) {
        files.forEach(function(sourceFile) {
            var relativeDir = path.dirname(sourceFile.replace(assetsDir, ""));
            var fileName = path.basename(sourceFile);
            platforms.forEach(function(platform) {
                var platformDir = platform.mapAssetPath("");
                var destDir = path.join(platformDir, relativeDir);
                var destFile = path.join(destDir, fileName);
                try {
                    fsExtra.copySync(sourceFile, destFile);

                    console.log("[ASSET] " + sourceFile + " == " + destFile);
                } catch (error) {
                    console.log(error.message);
                    console.log(error.stack);
                    process.exit(1);
                }
            });
        });
    });
}


function buildRasterImages(platforms) {
    var sourceDir = "app/resources/images/";
    glob(sourceDir + "**/*[.png|.jpg]", function(err, files) {
        files.forEach(function(sourcePath) {
            if (sourcePath.indexOf("@") == -1) { //already converted
                let ext = path.extname(sourcePath).toLowerCase();
                let destDir = path.dirname(sourcePath.replace(sourceDir, "")) + "/";
                let imageName = path.basename(sourcePath, ext);
                let ratios = PLATFORMS.android.ratios;
                let callbackCounter = 0;

                sharp(sourcePath).metadata().then((metadata) => {
                    try {
                        let originalWidth = metadata.width;
                        let originalHeight = metadata.height;

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
                                            fsExtra.mkdirpSync(path.dirname(dest));
                                        }

                                        let width = parseInt(originalWidth * factor);
                                        let height = parseInt(originalHeight * factor);

                                        callbackCounter++;
                                        sharp(sourcePath)
                                            .resize(width, height)
                                            .toFile(dest, (err) => {
                                                if (err) {
                                                    console.error("Error resizing image " + sourcePath + " with factor " + factor
                                                        + "(w=" + (width) + ", h=" + (height) + ")" + err)
                                                } else {
                                                    console.log("[SCALED] " + dest + " " + JSON.stringify({
                                                        width: width,
                                                        height: height
                                                    }))
                                                }

                                                callbackCounter--;

                                                //at the end of all operations
                                                if (callbackCounter == 0) {
                                                    if (platform.afterImage) {
                                                        platform.afterImage(destDir, imageName, ".png");
                                                    }
                                                }
                                            })
                                    }
                                })(ratios[i]);
                            }


                        });
                    } catch (e) {
                        console.error(e);
                        console.error(e.stack);
                    }
                });
            }
        });
    });
}

function buildSvgImages(platforms) {
    var sourceDir = "app/resources/images/";
    glob(sourceDir + "**/*.svg", function(err, files) {
        files.forEach(function(sourcePath) {
            console.log("Working on " + sourcePath);
            if (sourcePath.indexOf("@") == -1) { //already converted
                easyimage.info(sourcePath).then(function (info) {
                    var ext = path.extname(sourcePath).toLowerCase();
                    var relativeDir = path.dirname(sourcePath.replace(sourceDir, "")) + "/";
                    var imageName = path.basename(sourcePath, ext);
                    var ratios = PLATFORMS.android.ratios;
                    for (var i = 0; i < ratios.length; i++) {
                        (function (m) {
                            var factor = m;
                            pn.readFile(sourcePath)
                                .then(buffer => svg2png(buffer, {width: parseInt(info.width * factor), height: parseInt(info.height * factor)}))
                                .then(buffer => {
                                    platforms.forEach(platform => {
                                        if (platform.ratios.indexOf(m) != -1) {
                                            var dest = platform.mapImagePath(relativeDir, imageName, ".png", m);
                                            if (dest == null) {
                                                return;
                                            }

                                            if (!fs.existsSync(path.dirname(dest))) {
                                                fsExtra.mkdirpSync(path.dirname(dest));
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
                                })
                                .catch(e => { console.log(e.message); console.error(e.stack) });
                        })(ratios[i]);
                    }

                });
            } 
        });
    });
}

var scriptsDir = "app/js/";
var libsDir = "app/js/libs/";
function buildScripts(platforms) {
    platforms.forEach(function (platform) {
        if (platform.combineScripts) {
            platform.combined = [];
        }
    });

    glob(scriptsDir + "**/*.js", function (error, files) {
        files.forEach(function (sourceFile) {
            if (sourceFile.indexOf(libsDir) != -1) {
                var relativeDir = path.dirname(sourceFile.replace(scriptsDir, ""));
                var scriptName = path.basename(sourceFile);
                var moduleName = path.join(relativeDir, scriptName);
                platforms.forEach(function (platform) {
                    var jsDir = platform.mapAssetPath("js");
                    var destDir = path.join(jsDir, relativeDir);
                    var destFile = path.join(destDir, scriptName);
                    try {
                        if (platform.combineScripts) {
                            var source = fs.readFileSync(sourceFile);

                            platform.combined.push({
                                module: moduleName,
                                source: source
                            });
                            console.log("[COMBINELIB] " + moduleName);
                        } else {
                            fsExtra.copySync(sourceFile, destFile);
                            console.log("[COPIED] " + sourceFile + " == " + destFile);
                        }
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
            var moduleName = path.join(relativeDir, scriptName);
            var result = babel.transformFileSync(sourceFile, {presets: ["babel-preset-es2015"].map(require.resolve)});

            platforms.forEach(function (platform) {
                var jsDir = platform.mapAssetPath("js");
                var destDir = path.join(jsDir, relativeDir);
                var destFile = path.join(destDir, scriptName);
                try {
                    if (platform.combineScripts) {
                        platform.combined.push({
                            module: moduleName,
                            source: result.code
                        });

                        console.log("[COMBINED] " + moduleName);
                    } else {
                        fsExtra.mkdirpSync(destDir);
                        fs.writeFileSync(destFile, result.code);

                        console.log("[COMPILED] " + sourceFile + " => " + destFile);
                    }
                } catch (error) {
                    console.log(error.message);
                    console.log(error.stack);
                    process.exit(1);
                }
            });
        });

        platforms.forEach(function (platform) {
            if (platform.combineScripts) {
                var jsDir = platform.mapAssetPath("js");
                var destDir = jsDir;
                var destFile = path.join(destDir, "app.js");

                var code = "";

                platform.combined.forEach(function (c) {
                    code += ("define('" + c.module + "', function(module, exports) {\n" +
                                c.source + "\n" +
                            "});\n")
                });

                code += "\nrequire('./aj').createRuntime();";
                code += "\nrequire('./main').main();"

                fsExtra.mkdirpSync(destDir);
                fs.writeFileSync(destFile, code);

                console.log("[WRITTEN] " + destFile);
            }
        });
    });
};

function buildAppIcon(platforms) {
    let appIcon = "app/resources/app_icon.png";
    if (!fs.existsSync(appIcon)) {
        console.warn("[WARNING] appIcon not found on " + appIcon);
        return;
    }

    sharp(appIcon).metadata()
        .then((metadata) => {
            if (metadata.width != 1024 || metadata.height != 1024) {
                throw new Error("app_icon size must be 1024x1024")
            }

            platforms.forEach(p => {
                if (p.generateAppIcon) {
                    p.generateAppIcon(appIcon);
                }
            })
        })
        .catch(err => {
            console.error(err);
        })
}

module.exports = function build(_platforms, types) {
    if (!utils.isApp()) {
        console.error("Please run this command on app root directory");
        return;
    }

    let selectedPlatforms = [];

    let all = !_platforms || _platforms.contains("all");

    if (all) {
        ALL_PLATFORMS.forEach(platform => selectedPlatforms.push(platform))
    } else {
        _platforms.forEach(pname => {
            let platform = PLATFORMS[pname];
            if (!platform) {
                console.log("Unknown platform: " + pname);
                process.exit(1);
                return;
            } else {
                selectedPlatforms.push(platform);
            }
        })
    }

    types = types || ["all"];

    all = types.contains("all");

    if (all || types.contains("scripts")) {
        buildScripts(selectedPlatforms);
    }

    if (all || types.contains("assets")) {
        buildAssets(selectedPlatforms);
    }

    if (all || types.contains("images")) {
        buildRasterImages(selectedPlatforms);
    }

    if (all || types.contains("app_icon")) {
        buildAppIcon(selectedPlatforms);
    }




};