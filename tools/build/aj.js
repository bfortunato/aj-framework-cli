#!/usr/bin/env node
"use strict";

var _commands = require("./commands");

var program = require("commander");

program.version("0.0.1");

program.command("init <path>").description("Creates a new AJ project in specified path").action(function (path) {
    (0, _commands.init)(path);
});

program.command("build").description("Build resources and scripts for all platforms").action(function () {
    (0, _commands.build)();
});

program.command("watch").description("Starts a watcher for scripts").action(function () {
    (0, _commands.watch)();
});

program.command("*").action(function () {
    program.outputHelp();
});

program.parse(process.argv);