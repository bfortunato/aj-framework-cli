"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.generateActions = generateActions;
exports.generateStores = generateStores;

var _platforms2 = require("../platforms");

var PLATFORMS = _interopRequireWildcard(_platforms2);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var glob = require("glob");
var path = require("path");
var fs = require("fs");
var fsExtra = require("fs-extra");
var pn = require("pn/fs");

var utils = require("../utils");

var ALL_PLATFORMS = [];
for (var k in PLATFORMS) {
    ALL_PLATFORMS.push(PLATFORMS[k]);
}

Array.prototype.contains = function (el) {
    return this.indexOf(el) != -1;
};

var extensions = ["js", "jsx", "html", "java", "h", "c", "cpp", "swift", "sass", "css", "png", "jpg"];

function doUpdate(source, force) {
    platforms.forEach(function (platform) {
        if (platform.combineScripts) {
            if (!platform.combined) {
                platform.combined = [];
            } else {
                platform.combined.forEach(function (c) {
                    return c.valid = false;
                });
            }
        }
    });

    glob(sourceDir + "**/*.{" + extensions.join(",") + "}", function (error, files) {
        files.forEach(function (sourceFile) {
            var relativeDir = path.dirname(sourceFile.replace(scriptsDir, ""));
            var scriptName = path.basename(sourceFile);
            var moduleName = path.join(relativeDir, scriptName);

            if (sourceFile.indexOf(libsDir) != -1) {
                platforms.forEach(function (platform) {
                    var jsDir = platform.mapAssetPath("js");
                    var destDir = path.join(jsDir, relativeDir);
                    var destFile = path.join(destDir, scriptName);
                    try {
                        if (platform.combineScripts) {
                            if (combinedNeedsUpdate(platform.combined, moduleName)) {
                                var source = fs.readFileSync(sourceFile);
                                setCombined(platform.combined, moduleName, source);

                                console.log("[COMBINELIB] " + moduleName);
                            } else {
                                console.log("[CACHEDLIB] " + moduleName);
                            }
                            validateCombined(platform.combined, moduleName);
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

            moduleName = moduleName.replace(".jsx", ".js");
            var result = null;
            function getResult() {
                if (result == null) {
                    result = babel.transformFileSync(sourceFile, { presets: ["babel-preset-es2015", "babel-preset-react"].map(require.resolve) });
                }

                return result;
            }

            platforms.forEach(function (platform) {
                var jsDir = platform.mapAssetPath("js");
                var destDir = path.join(jsDir, relativeDir);
                var destFile = path.join(destDir, scriptName);
                destFile = destFile.replace(".jsx", ".js");
                try {
                    if (platform.combineScripts) {
                        if (combinedNeedsUpdate(platform.combined, moduleName)) {
                            setCombined(platform.combined, moduleName, getResult().code);

                            console.log("[COMBINED] " + moduleName);
                        } else {
                            console.log("[CACHED] " + moduleName);
                        }

                        validateCombined(platform.combined, moduleName);
                    } else {
                        fsExtra.mkdirpSync(destDir);

                        if (production) {
                            var uglified = uglifyjs.minify(getResult().code, { fromString: true });

                            fs.writeFileSync(destFile, uglified.code);

                            console.log("[COMPILED.MIN] " + sourceFile + " == " + destFile);
                        } else {
                            fs.writeFileSync(destFile, getResult().code);
                            console.log("[COMPILED] " + sourceFile + " => " + destFile);
                        }
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
                    if (c.valid) {
                        code += "define('" + c.module + "', function(module, exports) {\n" + c.source + "\n" + "});\n";
                    }
                });

                code += "\nrequire('./aj').createRuntime();";
                code += "\nrequire('./main').main();";

                fsExtra.mkdirpSync(destDir);

                if (production) {
                    var result = uglifyjs.minify(code, { fromString: true });
                    fs.writeFileSync(destFile, result.code);

                    console.log("[WRITTEN.MIN] " + destFile);
                } else {
                    fs.writeFileSync(destFile, code);

                    console.log("[WRITTEN] " + destFile);
                }
            }
        });

        if (cb) {
            cb();
        }
    });
};

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
        var source = fs.readFileSync(files[0], "UTF8");
        if (source) {
            var reg = /package ([^;]+)/g;
            var matches = reg.exec(source);
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

module.exports = function build(_platforms, types, production, scriptsCb) {
    if (!utils.isApp()) {
        console.error("Please run this command on app root directory");
        return;
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