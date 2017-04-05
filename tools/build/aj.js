#!/usr/bin/env node
"use strict";

var _commands = require("./commands");

var program = require("commander");

function list(val) {
    return val.split(',');
}

program.version("aj-framework-cli v1.0.22");

program.command("init <path>").description("Creates a new AJ project in specified path").action(function (path) {
    (0, _commands.init)(path);
});

program.command("build").option("-p, --platforms <platforms>", "The platforms you want to build, comma separated (all, ios, android, node, web), default all", list).option("-t, --types <types>", "The types you want to build (all, scripts, images, app_icon, definitions), default all", list).option("-p, --production", "Specify this options if you want to minify js files").description("Build resources and scripts for all platforms").action(function (options) {
    (0, _commands.build)(options.platforms, options.types, options.production);
});

program.command("watch").option("-p, --platforms <platforms>", "The platforms you want to build, comma separated (all, ios, android, node, web), default all", list).description("Starts a watcher for scripts").action(function (options) {
    (0, _commands.watch)(options.platforms);
});

program.command("update").option("-s, --source-dir <path>", "The path to use to update project framework files").option("-a, --ignore-added", "Ignore added files. Works only on changes").option("-n, --no-changes", "Do not change any file. Just a simulation").option("-f, --force", "Do not require confirm for file substitution").action(function (options) {
    (0, _commands.update)(options.sourceDir, options.ignoreAdded, options.noChanges, options.force);
});

program.command("*").action(function () {
    program.outputHelp();
});

program.parse(process.argv);