"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.buildScripts = buildScripts;
exports.generateActions = generateActions;
exports.generateStores = generateStores;
exports.default = build;

var _platforms2 = require("../platforms");

var PLATFORMS = _interopRequireWildcard(_platforms2);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var babel = require("babel-core");
var glob = require("glob");
var path = require("path");
var fs = require("fs");
var fsExtra = require("fs-extra");
var pn = require("pn/fs");
var sharp = require("sharp");
var sourcemaps = require("gulp-sourcemaps");
var source = require("vinyl-source-stream");
var buffer = require("vinyl-buffer");
var browserify = require("browserify");
var watchify = require("watchify");
var babelify = require("babelify");
var utils = require("../utils");
var uglifyjs = require("uglify-js");
var vfs = require('vinyl-fs');

var ALL_PLATFORMS = [];
for (var k in PLATFORMS) {
    ALL_PLATFORMS.push(PLATFORMS[k]);
}

Array.prototype.contains = function (el) {
    return this.indexOf(el) != -1;
};

function buildAssets(platforms) {
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
    glob(sourceDir + "**/*[.png|.jpg]", function (err, files) {
        files.forEach(function (sourcePath) {
            if (sourcePath.indexOf("@") == -1) {
                //already converted
                var ext = path.extname(sourcePath).toLowerCase();
                var destDir = path.dirname(sourcePath.replace(sourceDir, "")) + "/";
                var imageName = path.basename(sourcePath, ext);
                var ratios = PLATFORMS.android.ratios;
                var callbackCounter = 0;

                sharp(sourcePath).metadata().then(function (metadata) {
                    try {
                        var originalWidth = metadata.width;
                        var originalHeight = metadata.height;

                        platforms.forEach(function (platform) {
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

                                        var width = parseInt(originalWidth * factor);
                                        var height = parseInt(originalHeight * factor);

                                        callbackCounter++;
                                        sharp(sourcePath).resize(width, height).toFile(dest, function (err) {
                                            if (err) {
                                                console.error("Error resizing image " + sourcePath + " with factor " + factor + "(w=" + width + ", h=" + height + ")" + err);
                                            } else {
                                                console.log("[SCALED] " + dest + " " + JSON.stringify({
                                                    width: width,
                                                    height: height
                                                }));
                                            }

                                            callbackCounter--;

                                            //at the end of all operations
                                            if (callbackCounter == 0) {
                                                if (platform.afterImage) {
                                                    platform.afterImage(destDir, imageName, ".png");
                                                }
                                            }
                                        });
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
    glob(sourceDir + "**/*.svg", function (err, files) {
        files.forEach(function (sourcePath) {
            console.log("Working on " + sourcePath);
            if (sourcePath.indexOf("@") == -1) {
                //already converted
                easyimage.info(sourcePath).then(function (info) {
                    var ext = path.extname(sourcePath).toLowerCase();
                    var relativeDir = path.dirname(sourcePath.replace(sourceDir, "")) + "/";
                    var imageName = path.basename(sourcePath, ext);
                    var ratios = PLATFORMS.android.ratios;
                    for (var i = 0; i < ratios.length; i++) {
                        (function (m) {
                            var factor = m;
                            pn.readFile(sourcePath).then(function (buffer) {
                                return svg2png(buffer, { width: parseInt(info.width * factor), height: parseInt(info.height * factor) });
                            }).then(function (buffer) {
                                platforms.forEach(function (platform) {
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
                            }).catch(function (e) {
                                console.log(e.message);console.error(e.stack);
                            });
                        })(ratios[i]);
                    }
                });
            }
        });
    });
}

function getCombined(combinedList, moduleName) {
    for (var i = 0; i < combinedList.length; i++) {
        if (combinedList[i].module == moduleName) {
            return combinedList[i];
        }
    }

    return null;
}

function combinedNeedsUpdate(combinedList, moduleName) {
    var combined = getCombined(combinedList, moduleName);
    if (combined != null) {
        return combined.dirty;
    } else {
        return true;
    }
}

function setCombined(combinedList, moduleName, source) {
    var combined = getCombined(combinedList, moduleName);
    if (combined == null) {
        combined = { module: moduleName };
        combinedList.push(combined);
    }

    combined.source = source;
    combined.dirty = false;
}

function validateCombined(combinedList, moduleName) {
    var combined = getCombined(combinedList, moduleName);
    if (combined != null) {
        combined.valid = true;
    }
}

function timestamp() {
    var date = new Date();

    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    var millis = date.getMilliseconds();

    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;

    ///let str = hour + ":" + min + ":" + sec + "." + millis;
    var str = hour + ":" + min + ":" + sec;

    return str;
}

function buildScripts(platforms, production, cb) {
    var watch = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

    var scriptsDir = "./app/js/";
    var entryPoint = scriptsDir + "app.js";

    var bundler = browserify(entryPoint, { debug: true, cache: {}, packageCache: {}, extensions: [".js", ".jsx"] }).transform(babelify, { presets: [require.resolve("@babel/preset-env"), require.resolve("@babel/preset-react")] });

    if (watch) {
        bundler = watchify(bundler);
    }

    function rebundle() {
        console.log("[" + timestamp() + "] " + "Bundling " + entryPoint + "...");

        var pipeline = bundler.bundle().pipe(source(entryPoint)).pipe(buffer()).pipe(sourcemaps.init({ loadMaps: true })).pipe(sourcemaps.write("./source_maps", { sourceMappingURL: function sourceMappingURL(file) {
                return "app.js.map";
            } })).pipe(vfs.dest("./build")).on("error", function (err) {
            console.error(err);
            this.emit("end");
        }).on("finish", function () {
            var sourceFile = "./build/app/js/app.js";
            var sourceMapFile = "./build/source_maps/app/js/app.js.map";

            platforms.forEach(function (platform) {
                var destDir = platform.mapAssetPath("js");
                var destFile = path.posix.join(destDir, "app.js");
                var destMapFile = path.posix.join(destDir, "app.js.map");
                try {
                    fsExtra.copySync(sourceFile, destFile);
                    console.log("[COPIED] " + sourceFile + " == " + destFile);

                    fsExtra.copySync(sourceMapFile, destMapFile);
                    console.log("[COPIED] " + sourceMapFile + " == " + destMapFile);
                } catch (error) {
                    console.log(error.message);
                    console.log(error.stack);
                    process.exit(1);
                }
            });
            console.log("[" + timestamp() + "] " + "READY!");
        });
    }

    if (watch) {
        bundler.on("update", function () {
            rebundle();
        });
    }

    rebundle();
}

function buildAppIcon(platforms) {
    var appIcon = "app/resources/app_icon.png";
    if (!fs.existsSync(appIcon)) {
        console.warn("[WARNING] appIcon not found on " + appIcon);
        return;
    }

    sharp(appIcon).metadata().then(function (metadata) {
        if (metadata.width != 1024 || metadata.height != 1024) {
            throw new Error("app_icon size must be 1024x1024");
        }

        platforms.forEach(function (p) {
            if (p.generateAppIcon) {
                p.generateAppIcon(appIcon);
            }
        });
    }).catch(function (err) {
        console.error(err);
    });
}

function findAndroidPackage(codeBase) {
    var result = {
        success: false
    };

    var files = glob.sync(codeBase + "/**/Actions.java");
    if (files && files.length > 0) {
        var _source = fs.readFileSync(files[0], "UTF8");
        if (_source) {
            var reg = /package ([^;]+)/g;
            var matches = reg.exec(_source);
            if (matches && matches.length > 0) {
                result.pkg = matches[1];
                result.success = true;
            }
        }
    }

    return result;
}

function findFilePath(codeBase, file) {
    var result = {
        success: false
    };

    var files = glob.sync(codeBase + "**/" + file);
    if (files && files.length > 0) {
        result.path = files[0];
        result.success = true;
    }

    return result;
}

function generateActions(cb) {
    var cwd = process.cwd();
    var path = cwd + "/app/js/actions.js";

    var actions = [];

    fs.readFile(path, "UTF8", function (err, res) {
        if (!res) {
            return;
        }

        var reg = /(createAction|createAsyncAction)\(([^,]+)/g;
        var matches = res.match(reg);

        matches.forEach(function (m) {
            var action = m.replace("createAction(", "").replace("createAsyncAction(", "");
            actions.push(action);
        });

        var iosCode = "\n//\n//  Actions.swift\n//\n//  Auto generated from aj build\n//\n\nimport Foundation\n        \nstruct Actions {\n" + actions.map(function (s) {
            return "\tstatic let " + s + " = \"" + s + "\"";
        }).join("\n") + "\n}\n";

        var androidCode = "\n//\n//  Actions.java\n//\n//  Auto generated from aj build\n//\n\npackage applica.app;\n        \npublic class Actions {\n" + actions.map(function (s) {
            return "\tpublic static final String " + s + " = \"" + s + "\";";
        }).join("\n") + "\n}\n";

        cb({
            android: androidCode,
            ios: iosCode
        });
    });
}

function generateStores(cb) {
    var cwd = process.cwd();
    var path = cwd + "/app/js/stores.js";

    var stores = [];

    fs.readFile(path, "UTF8", function (err, res) {
        if (!res) {
            return;
        }

        var reg = /createStore\(([^,]+)/g;
        var matches = res.match(reg);

        matches.forEach(function (m) {
            var store = m.replace("createStore(", "");
            stores.push(store);
        });

        var iosCode = "\n//\n//  Stores.swift\n//\n//  Auto generated from aj build\n//\n\nimport Foundation\n        \nstruct Stores {\n" + stores.map(function (s) {
            return "\tstatic let " + s + " = \"" + s + "\"";
        }).join("\n") + "\n}\n";

        var androidCode = "\n//\n//  Stores.java\n//\n//  Auto generated from aj build\n//\n\npackage applica.app;\n        \npublic class Stores {\n" + stores.map(function (s) {
            return "\tpublic static final String " + s + " = \"" + s + "\";";
        }).join("\n") + "\n}\n";

        cb({
            android: androidCode,
            ios: iosCode
        });
    });
}

function buildDefinitions(platforms) {
    generateStores(function (stores) {
        return generateActions(function (actions) {
            platforms.forEach(function (platform) {
                if (platform.name == "ios") {
                    var codeBase = platform.mapCodeBasePath("");
                    var actionsIos = findFilePath(codeBase, "Actions.swift");
                    var storesIos = findFilePath(codeBase, "Stores.swift");
                    if (actionsIos.success && storesIos.success) {
                        fs.writeFileSync(actionsIos.path, actions.ios);
                        console.log("[GENERATED] " + actionsIos.path);
                        fs.writeFileSync(storesIos.path, stores.ios);
                        console.log("[GENERATED] " + storesIos.path);
                    } else {
                        console.log("[WARNING] Cannot generate definitions for iOS");
                    }
                } else if (platform.name == "android") {
                    var _codeBase = platform.mapCodeBasePath("");
                    var pkg = findAndroidPackage(_codeBase);
                    var actionsJava = findFilePath(_codeBase, "Actions.java");
                    var storesJava = findFilePath(_codeBase, "Stores.java");
                    if (pkg.success && actionsJava.success && storesJava.success) {
                        fs.writeFileSync(actionsJava.path, actions.android.replace("package applica.app;", "package " + pkg.pkg + ";"));
                        console.log("[GENERATED] " + actionsJava.path);
                        fs.writeFileSync(storesJava.path, stores.android.replace("package applica.app;", "package " + pkg.pkg + ";"));
                        console.log("[GENERATED] " + storesJava.path);
                    } else {
                        console.log("[WARNING] Cannot generate definitions for Android");
                    }
                }
            });
        });
    });
}

function build(_platforms, types, production, scriptsCb) {
    if (!utils.isApp()) {
        console.error("Please run this command on app root directory");
        return;
    }

    if (production) {
        console.log("*** PRODUCTION MODE ***");
    }

    var selectedPlatforms = [];

    var all = !_platforms || _platforms.contains("all");

    if (all) {
        ALL_PLATFORMS.forEach(function (platform) {
            return selectedPlatforms.push(platform);
        });
    } else {
        _platforms.forEach(function (pname) {
            var platform = PLATFORMS[pname];
            if (!platform) {
                console.log("Unknown platform: " + pname);
                process.exit(1);
                return;
            } else {
                selectedPlatforms.push(platform);
            }
        });
    }

    types = types || ["all"];

    all = types.contains("all");

    if (all || types.contains("scripts")) {
        buildScripts(selectedPlatforms, production, scriptsCb);
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

    if (types.contains("definitions")) {
        buildDefinitions(selectedPlatforms);
    }
};