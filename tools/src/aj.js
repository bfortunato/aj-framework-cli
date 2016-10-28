#!/usr/bin/env node

"use strict";

const program = require("commander");
import { init, build, watch } from "./commands"

function list(val) {
    return val.split(',');
}

program
    .version("0.0.1")

program
    .command("init <path>")
    .description("Creates a new AJ project in specified path")
    .action(function(path) {
        init(path);
    });

program
    .command("build")
    .option("-p, --platforms <platforms>", "The platforms you want to build, comma separated (all, ios, android, node, web), default all", list)
    .option("-t, --types <types>", "The types you want to build (all, scripts, images), default all", list)
    .description("Build resources and scripts for all platforms")
    .action(function(options) {
        build(options.platforms, options.types);
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