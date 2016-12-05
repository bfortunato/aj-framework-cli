#!/usr/bin/env node

"use strict";

const program = require("commander");
import { init, build, watch } from "./commands"

function list(val) {
    return val.split(',');
}

program
    .version("aj-framework-cli v1.0.9")

program
    .command("init <path>")
    .description("Creates a new AJ project in specified path")
    .action(function(path) {
        init(path);
    });

program
    .command("build")
    .option("-p, --platforms <platforms>", "The platforms you want to build, comma separated (all, ios, android, node, web), default all", list)
    .option("-t, --types <types>", "The types you want to build (all, scripts, images, app_icon, definitions), default all", list)
    .option("-p, --production", "Specify this options if you want to minify js files")
    .description("Build resources and scripts for all platforms")
    .action(function(options) {
        build(options.platforms, options.types, options.production);
    });

program
    .command("watch")
    .option("-p, --platforms <platforms>", "The platforms you want to build, comma separated (all, ios, android, node, web), default all", list)
    .description("Starts a watcher for scripts")
    .action(function(options) {
        watch(options.platforms);
    });

program
    .command("*")
    .action(function() {
        program.outputHelp();
    });

program.parse(process.argv);