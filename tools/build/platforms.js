"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var fs = require("fs");
var fsExtra = require("fs-extra");
var sharp = require("sharp");
var path = require("path");

var android = exports.android = {
    name: "android",
    mapAssetPath: function mapAssetPath(path) {
        return "platforms/android/App/app/src/main/assets/" + path;
    },
    mapCodeBasePath: function mapCodeBasePath(path) {
        return "platforms/android/App/app/src/main/java/" + path;
    },
    mapImagePath: function mapImagePath(dir, name, extension, ratio) {
        var mipmap = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

        var quality = "";
        switch (ratio) {
            case 0.75:
                quality = "-ldpi";
                break;
            case 1:
                quality = "-mdpi";
                break;
            case 1.5:
                quality = "-hdpi";
                break;
            case 2:
                quality = "-xhdpi";
                break;
            case 3:
                quality = "-xxhdpi";
                break;
            case 4:
                quality = "-xxxhdpi";
                break;

        }

        var folder = mipmap ? "mipmap" : "drawable";

        return "platforms/android/App/app/src/main/res/" + folder + quality + "/" + name + extension;
    },
    generateAppIcon: function generateAppIcon(sourceImage) {
        var _this = this;

        var destDir = "platforms/web/resources";

        if (!fs.existsSync(path.dirname(destDir))) {
            fsExtra.mkdirpSync(path.dirname(destDir));
        }

        //size of android launcher image at xxxhdpi
        var originalWidth = 192;
        var originalHeight = 192;

        this.ratios.forEach(function (r) {
            var factor = r / 4;
            var width = parseInt(originalWidth * factor);
            var height = parseInt(originalHeight * factor);
            var destPath = _this.mapImagePath(destDir, "ic_launcher", ".png", r, true);

            if (!fs.existsSync(path.dirname(destPath))) {
                fsExtra.mkdirpSync(path.dirname(destPath));
            }

            sharp(sourceImage).resize(width, height).toFile(destPath, function (err) {
                if (err) {
                    console.error("Error resizing image " + sourceImage + " with factor " + factor + "(w=" + width + ", h=" + height + ")" + err);
                } else {
                    console.log("[SCALED] " + destPath + " " + JSON.stringify({
                        width: width,
                        height: height
                    }));
                }
            });
        });
    },
    ratios: [0.75, 1, 1.5, 2, 3, 4]
};

var ios = exports.ios = {
    name: "ios",
    mapAssetPath: function mapAssetPath(path) {
        return "platforms/ios/App/App/assets/" + path;
    },
    mapCodeBasePath: function mapCodeBasePath(path) {
        return "platforms/ios/App/App/" + path;
    },
    mapImagePath: function mapImagePath(dir, name, extension, ratio) {
        return ("platforms/ios/App/App/Assets.xcassets/" + name + ".imageset/" + name + "@" + parseInt(ratio) + "x" + extension).replace("@1x", "");
    },
    afterImage: function afterImage(dir, name, extension) {
        var contents = {
            "images": [],
            "info": {
                "version": 1,
                "author": "applica"
            }
        };

        ios.ratios.forEach(function (r) {
            contents.images.push({
                "idiom": "universal",
                "filename": (name + "@" + parseInt(r) + "x" + extension).replace("@1x", ""),
                "scale": parseInt(r) + "x"
            });
        });

        fs.writeFile("platforms/ios/App/App/Assets.xcassets/" + name + ".imageset/Contents.json", JSON.stringify(contents), function (err) {
            if (err) {
                return console.log(err);
            }

            console.log("[CREATED] Contents.json for " + name);
        });
    },
    generateAppIcon: function generateAppIcon(sourceImage) {
        var contentsJson = {
            "images": [{
                "size": "20x20",
                "idiom": "iphone",
                "filename": "Icon-App-20x20@2x.png",
                "scale": "2x"
            }, {
                "size": "20x20",
                "idiom": "iphone",
                "filename": "Icon-App-20x20@3x.png",
                "scale": "3x"
            }, {
                "size": "29x29",
                "idiom": "iphone",
                "filename": "Icon-App-29x29@1x.png",
                "scale": "1x"
            }, {
                "size": "29x29",
                "idiom": "iphone",
                "filename": "Icon-App-29x29@2x.png",
                "scale": "2x"
            }, {
                "size": "29x29",
                "idiom": "iphone",
                "filename": "Icon-App-29x29@3x.png",
                "scale": "3x"
            }, {
                "size": "40x40",
                "idiom": "iphone",
                "filename": "Icon-App-40x40@2x.png",
                "scale": "2x"
            }, {
                "size": "40x40",
                "idiom": "iphone",
                "filename": "Icon-App-40x40@3x.png",
                "scale": "3x"
            }, {
                "size": "57x57",
                "idiom": "iphone",
                "filename": "Icon-App-57x57@1x.png",
                "scale": "1x"
            }, {
                "idiom": "iphone",
                "size": "57x57",
                "scale": "2x",
                "filename": "Icon-App-57x57@2x.png"
            }, {
                "size": "60x60",
                "idiom": "iphone",
                "filename": "Icon-App-60x60@2x.png",
                "scale": "2x"
            }, {
                "size": "60x60",
                "idiom": "iphone",
                "filename": "Icon-App-60x60@3x.png",
                "scale": "3x"
            }, {
                "size": "20x20",
                "idiom": "ipad",
                "filename": "Icon-App-20x20@1x.png",
                "scale": "1x"
            }, {
                "size": "20x20",
                "idiom": "ipad",
                "filename": "Icon-App-20x20@2x.png",
                "scale": "2x"
            }, {
                "size": "29x29",
                "idiom": "ipad",
                "filename": "Icon-App-29x29@1x.png",
                "scale": "1x"
            }, {
                "size": "29x29",
                "idiom": "ipad",
                "filename": "Icon-App-29x29@2x.png",
                "scale": "2x"
            }, {
                "size": "40x40",
                "idiom": "ipad",
                "filename": "Icon-App-40x40@1x.png",
                "scale": "1x"
            }, {
                "size": "40x40",
                "idiom": "ipad",
                "filename": "Icon-App-40x40@2x.png",
                "scale": "2x"
            }, {
                "size": "76x76",
                "idiom": "ipad",
                "filename": "Icon-App-76x76@1x.png",
                "scale": "1x"
            }, {
                "size": "76x76",
                "idiom": "ipad",
                "filename": "Icon-App-76x76@2x.png",
                "scale": "2x"
            }, {
                "size": "83.5x83.5",
                "idiom": "ipad",
                "filename": "Icon-App-83.5x83.5@2x.png",
                "scale": "2x"
            }, {
                "size": "40x40",
                "idiom": "iphone",
                "filename": "Icon-App-40x40@1x.png",
                "scale": "1x"
            }, {
                "size": "60x60",
                "idiom": "iphone",
                "filename": "Icon-App-60x60@1x.png",
                "scale": "1x"
            }, {
                "size": "76x76",
                "idiom": "iphone",
                "filename": "Icon-App-76x76@1x.png",
                "scale": "1x"
            }, {
                "size": "76x76",
                "idiom": "ipad",
                "filename": "Icon-App-76x76@3x.png",
                "scale": "3x"
            }],
            "info": {
                "version": 1,
                "author": "xcode"
            }
        };

        var destDir = "platforms/ios/App/App/Assets.xcassets/AppIcon.appiconset";

        if (!fs.existsSync(destDir)) {
            fsExtra.mkdirpSync(destDir);
        }

        contentsJson.images.forEach(function (image) {
            var _image$size$split = image.size.split("x"),
                _image$size$split2 = _slicedToArray(_image$size$split, 2),
                width = _image$size$split2[0],
                height = _image$size$split2[1];

            width = parseFloat(width);
            height = parseFloat(height);
            var scale = parseInt(image.scale);
            width *= scale;
            height *= scale;
            var destPath = destDir + "/" + image.filename;
            sharp(sourceImage).resize(width, height).toFile(destPath, function (err) {
                if (err) {
                    console.error("Error resizing image " + sourceImage + " with factor " + factor + "(w=" + width + ", h=" + height + ")" + err);
                } else {
                    console.log("[SCALED] " + destPath + " " + JSON.stringify({
                        width: width,
                        height: height
                    }));
                }
            });
        });

        var contentsJsonPath = destDir + "/Contents.json";
        fs.writeFile(contentsJsonPath, JSON.stringify(contentsJson), function (err) {
            if (err) {
                return console.log(err);
            }

            console.log("[CREATED] Contents.json for AppIcon");
        });
    },
    ratios: [1, 2, 3]
};

var node = exports.node = {
    name: "node",
    mapAssetPath: function mapAssetPath(path) {
        return "platforms/node/assets/" + path;
    },
    mapImagePath: function mapImagePath() {
        return null;
    },
    ratios: [0.75, 1, 1.5, 2, 3, 4]
};

var react = exports.react = {
    name: "node",
    mapAssetPath: function mapAssetPath(path) {
        return "platforms/react/assets/" + path;
    },
    mapImagePath: function mapImagePath(dir, name, extension, ratio) {
        return ("platforms/react/assets/images/" + name + "@" + parseInt(ratio) + "x" + extension).replace("@1x", "");
    },
    ratios: [1, 2, 3, 4]
};

var web = exports.web = {
    name: "web",
    combineScripts: true,
    mapAssetPath: function mapAssetPath(path) {
        return "platforms/web/assets/" + path;
    },
    mapImagePath: function mapImagePath(dir, name, extension, ratio) {
        return "platforms/web/resources/images/" + name + extension;
    },
    generateAppIcon: function generateAppIcon(sourceImage) {
        var destDir = "platforms/web/resources";

        if (!fs.existsSync(destDir)) {
            fsExtra.mkdirpSync(destDir);
        }

        var width = 32;
        var height = 32;

        var destPath = destDir + "/favicon.png";
        sharp(sourceImage).resize(width, height).toFile(destPath, function (err) {
            if (err) {
                console.error("Error resizing image " + sourceImage + " with factor " + factor + "(w=" + width + ", h=" + height + ")" + err);
            } else {
                console.log("[SCALED] " + destPath + " " + JSON.stringify({
                    width: width,
                    height: height
                }));
            }
        });
    },
    ratios: [2]
};