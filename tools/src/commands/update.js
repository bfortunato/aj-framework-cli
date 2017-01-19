"use strict";

const glob = require("glob");
const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
const pn = require("pn/fs");

const utils = require("../utils");

import * as PLATFORMS from "../platforms"
const ALL_PLATFORMS = [];
for (var k in PLATFORMS) {
    ALL_PLATFORMS.push(PLATFORMS[k]);
}

Array.prototype.contains = function(el) {
    return this.indexOf(el) != -1;
};

const extensions = [
    "js",
    "jsx",
    "html",
    "java",
    "h",
    "c",
    "cpp",
    "swift",
    "sass",
    "css",
    "png",
    "jpg"
]


function doUpdate(source, force) {
    platforms.forEach(function (platform) {
        if (platform.combineScripts) {
            if (!platform.combined) {
                platform.combined = [];
            } else {
                platform.combined.forEach(c => c.valid = false)
            }
        }
    });

    glob(sourceDir + "**/*.{" + extensions.join(",") +"}", function (error, files) {
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
                                setCombined(platform.combined, moduleName, source)

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
                    result = babel.transformFileSync(sourceFile, {presets: ["babel-preset-es2015", "babel-preset-react"].map(require.resolve)});
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
                            setCombined(platform.combined, moduleName, getResult().code)

                            console.log("[COMBINED] " + moduleName);
                        } else {
                            console.log("[CACHED] " + moduleName);
                        }

                        validateCombined(platform.combined, moduleName)
                    } else {
                        fsExtra.mkdirpSync(destDir);

                        if (production) {
                            let uglified = uglifyjs.minify(getResult().code, {fromString: true})

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
                        code += ("define('" + c.module + "', function(module, exports) {\n" +
                                    c.source + "\n" +
                                 "});\n")
                    }
                });

                code += "\nrequire('./aj').createRuntime();";
                code += "\nrequire('./main').main();"

                fsExtra.mkdirpSync(destDir);

                if (production) {
                    let result = uglifyjs.minify(code, {fromString: true})
                    fs.writeFileSync(destFile, result.code);

                    console.log("[WRITTEN.MIN] " + destFile);
                } else {
                    fs.writeFileSync(destFile, code);

                    console.log("[WRITTEN] " + destFile);
                }
            }
        });

        if (cb) {
            cb()
        }
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

function findAndroidPackage(codeBase) {
    let result = {
        success: false
    };

    let files = glob.sync(codeBase + "/**/Actions.java")
    if (files && files.length > 0) {
        let source = fs.readFileSync(files[0], "UTF8")
        if (source) {
            let reg = /package ([^;]+)/g
            let matches = reg.exec(source)
            if (matches && matches.length > 0) {
                result.pkg = matches[1]
                result.success = true
            }
        }
    }

    return result
}

function findFilePath(codeBase, file) {
    let result = {
        success: false
    };

    let files = glob.sync(codeBase + "**/" + file)
    if (files && files.length > 0) {
        result.path = files[0]
        result.success = true
    }

    return result
}


export function generateActions(cb) {
    let cwd = process.cwd()
    let path = cwd + "/app/js/actions.js"

    let actions = []

    fs.readFile(path, "UTF8", (err, res) => {
        if (!res) { return }

        let reg = /(createAction|createAsyncAction)\(([^,]+)/g
        let matches = res.match(reg)

        matches.forEach(m => {
            let action = m.replace("createAction(", "").replace("createAsyncAction(", "")
            actions.push(action)
        })

        let iosCode = `
//
//  Actions.swift
//
//  Auto generated from aj build
//

import Foundation
        
struct Actions {
${actions.map(s => `\tstatic let ${s} = "${s}"`).join("\n")}
}
`

        let androidCode = `
//
//  Actions.java
//
//  Auto generated from aj build
//

package applica.app;
        
public class Actions {
${actions.map(s => `\tpublic static final String ${s} = "${s}";`).join("\n")}
}
`

        cb({
            android: androidCode,
            ios: iosCode
        })
    })
}

export function generateStores(cb) {
    let cwd = process.cwd()
    let path = cwd + "/app/js/stores.js"

    let stores = []

    fs.readFile(path, "UTF8", (err, res) => {
        if (!res) { return }

        let reg = /createStore\(([^,]+)/g
        let matches = res.match(reg)

        matches.forEach(m => {
            let store = m.replace("createStore(", "")
            stores.push(store)
        })

        let iosCode = `
//
//  Stores.swift
//
//  Auto generated from aj build
//

import Foundation
        
struct Stores {
${stores.map(s => `\tstatic let ${s} = "${s}"`).join("\n")}
}
`

        let androidCode = `
//
//  Stores.java
//
//  Auto generated from aj build
//

package applica.app;
        
public class Stores {
${stores.map(s => `\tpublic static final String ${s} = "${s}";`).join("\n")}
}
`

        cb({
            android: androidCode,
            ios: iosCode
        })

    })
}


function buildDefinitions(platforms) {
    generateStores((stores) => generateActions(actions => {
        platforms.forEach(platform => {
            if (platform.name == "ios") {
                let codeBase = platform.mapCodeBasePath("")
                let actionsIos = findFilePath(codeBase, "Actions.swift")
                let storesIos = findFilePath(codeBase, "Stores.swift")
                if (actionsIos.success && storesIos.success) {
                    fs.writeFileSync(actionsIos.path, actions.ios)
                    console.log("[GENERATED] " + actionsIos.path)
                    fs.writeFileSync(storesIos.path, stores.ios)
                    console.log("[GENERATED] " + storesIos.path)
                } else {
                    console.log("[WARNING] Cannot generate definitions for iOS")
                }
            } else if (platform.name == "android") {
                let codeBase = platform.mapCodeBasePath("")
                let pkg = findAndroidPackage(codeBase)
                let actionsJava = findFilePath(codeBase, "Actions.java")
                let storesJava = findFilePath(codeBase, "Stores.java")
                if (pkg.success && actionsJava.success && storesJava.success) {
                    fs.writeFileSync(actionsJava.path, actions.android.replace("package applica.app;", "package " + pkg.pkg + ";"))
                    console.log("[GENERATED] " + actionsJava.path)
                    fs.writeFileSync(storesJava.path, stores.android.replace("package applica.app;", "package " + pkg.pkg + ";"))
                    console.log("[GENERATED] " + storesJava.path)
                } else {
                    console.log("[WARNING] Cannot generate definitions for Android")
                }
            }
        })
    }))
}

module.exports = function build(_platforms, types, production, scriptsCb) {
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