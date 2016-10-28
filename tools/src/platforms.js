"use strict";

const fs = require("fs");

export const android = {
    name: "android",
    mapAssetPath: function(path) {
        return "platforms/android/App/app/src/main/assets/" + path
    },
    mapImagePath: function(dir, name, extension, ratio) {
        var quality = "";
        switch (ratio) {
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

        return "platforms/android/App/app/src/main/res/drawable" + quality + "/" + name + extension;
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
    ratios: [3]
};