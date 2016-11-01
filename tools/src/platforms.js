"use strict";

const fs = require("fs");
const fsExtra = require("fs-extra");
const sharp = require("sharp");
const path = require("path");

export const android = {
    name: "android",
    mapAssetPath: function(path) {
        return "platforms/android/App/app/src/main/assets/" + path
    },
    mapImagePath: function(dir, name, extension, ratio, mipmap = false) {
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

        let folder = mipmap ? "mipmap" : "drawable";

        return "platforms/android/App/app/src/main/res/" + folder + quality + "/" + name + extension;
    },
    generateAppIcon: function(sourceImage) {
        let destDir = "platforms/web/resources";

        if (!fs.existsSync(path.dirname(destDir))) {
            fsExtra.mkdirpSync(path.dirname(destDir));
        }

        //size of android launcher image at xxxhdpi
        let originalWidth = 192;
        let originalHeight = 192;

        this.ratios.forEach(r => {
            let factor = r / 4;
            let width = parseInt(originalWidth * factor);
            let height = parseInt(originalHeight * factor);
            let destPath = this.mapImagePath(destDir, "ic_launcher", ".png", r, true);

            if (!fs.existsSync(path.dirname(destPath))) {
                fsExtra.mkdirpSync(path.dirname(destPath));
            }

            sharp(sourceImage)
                .resize(width, height)
                .toFile(destPath, err => {
                    if (err) {
                        console.error("Error resizing image " + sourceImage + " with factor " + factor
                            + "(w=" + (width) + ", h=" + (height) + ")" + err)
                    } else {
                        console.log("[SCALED] " + destPath + " " + JSON.stringify({
                                width: width,
                                height: height
                            }))
                    }
                })
        });


    },
    ratios: [0.75, 1, 1.5, 2, 3, 4]
};

export const ios = {
    name: "ios",
    mapAssetPath: function(path) {
        return "platforms/ios/App/App/assets/" + path
    },
    mapImagePath: function(dir, name, extension, ratio) {
        return ("platforms/ios/App/App/Assets.xcassets/" + name  + ".imageset/" + name + "@" + parseInt(ratio) + "x" + extension).replace("@1x", "");
    },
    afterImage: function(dir, name, extension) {
        var contents = {
            "images": [],
            "info": {
                "version": 1,
                "author": "applica"
            }
        };

        ios.ratios.forEach(r => {
            contents.images.push({
                "idiom": "universal",
                "filename": (name + "@" + parseInt(r) + "x" + extension).replace("@1x", ""),
                "scale": parseInt(r) + "x"
            })
        });

        fs.writeFile("platforms/ios/App/App/Assets.xcassets/" + name  + ".imageset/Contents.json", JSON.stringify(contents), function(err) {
            if(err) {
                return console.log(err);
            }

            console.log("[CREATED] Contents.json for " + name);
        });
    },
    generateAppIcon: function(sourceImage) {
        var contentsJson = {
            "images" : [
                {
                    "size" : "20x20",
                    "idiom" : "iphone",
                    "filename" : "Icon-App-20x20@2x.png",
                    "scale" : "2x"
                },
                {
                    "size" : "20x20",
                    "idiom" : "iphone",
                    "filename" : "Icon-App-20x20@3x.png",
                    "scale" : "3x"
                },
                {
                    "size" : "29x29",
                    "idiom" : "iphone",
                    "filename" : "Icon-App-29x29@1x.png",
                    "scale" : "1x"
                },
                {
                    "size" : "29x29",
                    "idiom" : "iphone",
                    "filename" : "Icon-App-29x29@2x.png",
                    "scale" : "2x"
                },
                {
                    "size" : "29x29",
                    "idiom" : "iphone",
                    "filename" : "Icon-App-29x29@3x.png",
                    "scale" : "3x"
                },
                {
                    "size" : "40x40",
                    "idiom" : "iphone",
                    "filename" : "Icon-App-40x40@2x.png",
                    "scale" : "2x"
                },
                {
                    "size" : "40x40",
                    "idiom" : "iphone",
                    "filename" : "Icon-App-40x40@3x.png",
                    "scale" : "3x"
                },
                {
                    "size" : "57x57",
                    "idiom" : "iphone",
                    "filename" : "Icon-App-57x57@1x.png",
                    "scale" : "1x"
                },
                {
                    "idiom" : "iphone",
                    "size" : "57x57",
                    "scale" : "2x",
                    "filename" : "Icon-App-57x57@2x.png",
                },
                {
                    "size" : "60x60",
                    "idiom" : "iphone",
                    "filename" : "Icon-App-60x60@2x.png",
                    "scale" : "2x"
                },
                {
                    "size" : "60x60",
                    "idiom" : "iphone",
                    "filename" : "Icon-App-60x60@3x.png",
                    "scale" : "3x"
                },
                {
                    "size" : "20x20",
                    "idiom" : "ipad",
                    "filename" : "Icon-App-20x20@1x.png",
                    "scale" : "1x"
                },
                {
                    "size" : "20x20",
                    "idiom" : "ipad",
                    "filename" : "Icon-App-20x20@2x.png",
                    "scale" : "2x"
                },
                {
                    "size" : "29x29",
                    "idiom" : "ipad",
                    "filename" : "Icon-App-29x29@1x.png",
                    "scale" : "1x"
                },
                {
                    "size" : "29x29",
                    "idiom" : "ipad",
                    "filename" : "Icon-App-29x29@2x.png",
                    "scale" : "2x"
                },
                {
                    "size" : "40x40",
                    "idiom" : "ipad",
                    "filename" : "Icon-App-40x40@1x.png",
                    "scale" : "1x"
                },
                {
                    "size" : "40x40",
                    "idiom" : "ipad",
                    "filename" : "Icon-App-40x40@2x.png",
                    "scale" : "2x"
                },
                {
                    "size" : "76x76",
                    "idiom" : "ipad",
                    "filename" : "Icon-App-76x76@1x.png",
                    "scale" : "1x"
                },
                {
                    "size" : "76x76",
                    "idiom" : "ipad",
                    "filename" : "Icon-App-76x76@2x.png",
                    "scale" : "2x"
                },
                {
                    "size" : "83.5x83.5",
                    "idiom" : "ipad",
                    "filename" : "Icon-App-83.5x83.5@2x.png",
                    "scale" : "2x"
                },
                {
                    "size" : "40x40",
                    "idiom" : "iphone",
                    "filename" : "Icon-App-40x40@1x.png",
                    "scale" : "1x"
                },
                {
                    "size" : "60x60",
                    "idiom" : "iphone",
                    "filename" : "Icon-App-60x60@1x.png",
                    "scale" : "1x"
                },
                {
                    "size" : "76x76",
                    "idiom" : "iphone",
                    "filename" : "Icon-App-76x76@1x.png",
                    "scale" : "1x"
                },
                {
                    "size" : "76x76",
                    "idiom" : "ipad",
                    "filename" : "Icon-App-76x76@3x.png",
                    "scale" : "3x"
                }
            ],
            "info" : {
                "version" : 1,
                "author" : "xcode"
            }
        };

        let destDir = "platforms/ios/App/App/Assets.xcassets/AppIcon.appiconset";

        if (!fs.existsSync(destDir)) {
            fsExtra.mkdirpSync(destDir);
        }

        contentsJson.images.forEach(image => {
            let [width, height] = image.size.split("x");
            width = parseInt(width);
            height = parseInt(height);
            let scale = parseInt(image.scale);
            width *= scale;
            height *= scale;
            let destPath = destDir + "/" + image.filename;
            sharp(sourceImage)
                .resize(width, height)
                .toFile(destPath, err => {
                    if (err) {
                        console.error("Error resizing image " + sourceImage + " with factor " + factor
                            + "(w=" + (width) + ", h=" + (height) + ")" + err)
                    } else {
                        console.log("[SCALED] " + destPath + " " + JSON.stringify({
                                width: width,
                                height: height
                            }))
                    }
                })
        });

        let contentsJsonPath = destDir + "/Contents.json";
        fs.writeFile(contentsJsonPath, JSON.stringify(contentsJson), function(err) {
            if(err) {
                return console.log(err);
            }

            console.log("[CREATED] Contents.json for AppIcon");
        });

    },
    ratios: [1, 2, 3]
};

export const node = {
    name: "node",
    mapAssetPath: function(path) {
        return "platforms/node/assets/" + path;
    },
    mapImagePath: function() {
        return null;
    },
    ratios: [0.75, 1, 1.5, 2, 3, 4]
};

export const web = {
    name: "web",
    combineScripts: true,
    mapAssetPath: function mapAssetPath(path) {
        return "platforms/web/assets/" + path;
    },
    mapImagePath: function mapImagePath(dir, name, extension, ratio) {
        return ("platforms/web/resources/images/" + name + extension);
    },
    generateAppIcon: function(sourceImage) {
        let destDir = "platforms/web/resources";

        if (!fs.existsSync(destDir)) {
            fsExtra.mkdirpSync(destDir);
        }

        let width = 32;
        let height = 32;

        let destPath = destDir + "/favicon.png";
        sharp(sourceImage)
            .resize(width, height)
            .toFile(destPath, err => {
                if (err) {
                    console.error("Error resizing image " + sourceImage + " with factor " + factor
                        + "(w=" + (width) + ", h=" + (height) + ")" + err)
                } else {
                    console.log("[SCALED] " + destPath + " " + JSON.stringify({
                            width: width,
                            height: height
                        }))
                }
            })

    },
    ratios: [1]
};