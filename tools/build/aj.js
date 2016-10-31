#!/usr/bin/env node


"use strict";

var _commands = require("./commands");

var program = require("commander");


function list(val) {
    return val.split(',');
}

program.version("1.0.0");

program.command("init <path>").description("Creates a new AJ project in specified path").action(function (path) {
    (0, _commands.init)(path);
});

program.command("build").option("-p, --platforms <platforms>", "The platforms you want to build, comma separated (all, ios, android, node, web), default all", list).option("-t, --types <types>", "The types you want to build (all, scripts, images), default all", list).description("Build resources and scripts for all platforms").action(function (options) {
    (0, _commands.build)(options.platforms, options.types);
});

program.command("watch").option("-p, --platforms <platforms>", "The platforms you want to build, comma separated (all, ios, android, node, web), default all", list).description("Starts a watcher for scripts").action(function (options) {
    (0, _commands.watch)(options.platforms);
});

program.command("*").action(function () {
    program.outputHelp();
});

program.parse(process.argv);