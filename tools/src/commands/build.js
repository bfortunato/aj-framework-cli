const glob = require("glob");
const path = require("path");
const fs = require("fs");
const fsExtra = require("fs-extra");
const pn = require("pn/fs");
const sharp = require("sharp");
const sourcemaps = require("gulp-sourcemaps");
const source = require("vinyl-source-stream");
const buffer = require("vinyl-buffer");
const browserify = require("browserify");
const watchify = require("watchify");
const babelify = require("babelify");
const utils = require("../utils");
const uglifyjs = require("uglify-js");
const vfs = require('vinyl-fs');

import * as PLATFORMS from "../platforms"
const ALL_PLATFORMS = [];
for (let k in PLATFORMS) {
    ALL_PLATFORMS.push(PLATFORMS[k]);
}

Array.prototype.contains = function(el) {
    return this.indexOf(el) != -1;
};

function buildAssets(platforms) {
    let assetsDir = "app/assets/";
    glob(assetsDir + "**/*", function(error, files) {
        files.forEach(function(sourceFile) {
            let relativeDir = path.dirname(sourceFile.replace(assetsDir, ""));
            let fileName = path.basename(sourceFile);
            platforms.forEach(function(platform) {
                let platformDir = platform.mapAssetPath("");
                let destDir = path.join(platformDir, relativeDir);
                let destFile = path.join(destDir, fileName);
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
    let sourceDir = "app/resources/images/";
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
                            for (let i = 0; i < ratios.length; i++) {
                                (function (m) {
                                    let factor = m / 4;

                                    if (platform.ratios.indexOf(m) != -1) {
                                        let dest = platform.mapImagePath(destDir, imageName, ".png", m);
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
    let sourceDir = "app/resources/images/";
    glob(sourceDir + "**/*.svg", function(err, files) {
        files.forEach(function(sourcePath) {
            console.log("Working on " + sourcePath);
            if (sourcePath.indexOf("@") == -1) { //already converted
                easyimage.info(sourcePath).then(function (info) {
                    let ext = path.extname(sourcePath).toLowerCase();
                    let relativeDir = path.dirname(sourcePath.replace(sourceDir, "")) + "/";
                    let imageName = path.basename(sourcePath, ext);
                    let ratios = PLATFORMS.android.ratios;
                    for (let i = 0; i < ratios.length; i++) {
                        (function (m) {
                            let factor = m;
                            pn.readFile(sourcePath)
                                .then(buffer => svg2png(buffer, {width: parseInt(info.width * factor), height: parseInt(info.height * factor)}))
                                .then(buffer => {
                                    platforms.forEach(platform => {
                                        if (platform.ratios.indexOf(m) != -1) {
                                            let dest = platform.mapImagePath(relativeDir, imageName, ".png", m);
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

function getCombined(combinedList, moduleName) {
    for (let i = 0; i < combinedList.length; i++) {
        if (combinedList[i].module == moduleName) {
            return combinedList[i]
        }
    }

    return null;
}

function combinedNeedsUpdate(combinedList, moduleName) {
    let combined = getCombined(combinedList, moduleName)
    if (combined != null) {
        return combined.dirty
    } else {
        return true
    }
}

function setCombined(combinedList, moduleName, source) {
    let combined = getCombined(combinedList, moduleName)
    if (combined == null) {
        combined = {module: moduleName}
        combinedList.push(combined)
    }

    combined.source = source
    combined.dirty = false
}

function validateCombined(combinedList, moduleName) {
    let combined = getCombined(combinedList, moduleName)
    if (combined != null) {
        combined.valid = true;
    }
}

function timestamp() {
    let date = new Date();

    let hour = date.getHours();
    let min = date.getMinutes();
    let sec = date.getSeconds();
    let millis = date.getMilliseconds();

    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;

    ///let str = hour + ":" + min + ":" + sec + "." + millis;
    let str = hour + ":" + min + ":" + sec;

    return str;
}

export function buildScripts(platforms, production, cb, watch = false) {
    let scriptsDir = "./app/js/";
    let entryPoint = scriptsDir + "app.js";

    let bundler = browserify(entryPoint, { debug: true, cache: {}, packageCache: {}, extensions: [".js", ".jsx"] })
        .transform(babelify, {presets: [require.resolve("@babel/preset-env"), require.resolve("@babel/preset-react")]})

    if (watch) {
        bundler = watchify(bundler);
    }

    function rebundle() {
        console.log("[" + timestamp() + "] " + "Bundling " + entryPoint + "...");

        const pipeline = bundler.bundle()    
            .pipe(source(entryPoint))
            .pipe(buffer())
            .pipe(sourcemaps.init({loadMaps: true}))
            .pipe(sourcemaps.write("./source_maps", {sourceMappingURL: function(file) { return "app.js.map"; }}))
            .pipe(vfs.dest("./build"))
            .on("error", function (err) {
                console.error(err);
                this.emit("end");
            })
            .on("finish", function () {
                const sourceFile = "./build/app/js/app.js";
                const sourceMapFile = "./build/source_maps/app/js/app.js.map";

                platforms.forEach(function (platform) {
                    const destDir = platform.mapAssetPath("js");
                    const destFile = path.posix.join(destDir, "app.js");
                    const destMapFile = path.posix.join(destDir, "app.js.map");
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
        bundler.on("update", function() {
            rebundle();
        });
    }

    rebundle();
}

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

export default function build(_platforms, types, production, scriptsCb) {
    if (!utils.isApp()) {
        console.error("Please run this command on app root directory");
        return;
    }

    if (production) {
        console.log("*** PRODUCTION MODE ***");
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