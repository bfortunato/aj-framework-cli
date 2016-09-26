#!/usr/bin/env node

"use strict";

const program = require("commander");
import { init, build, watch } from "./commands"

program
    .version("0.0.1");

program
    .command("init <path>")
    .description("Creates a new AJ project in specified path")
    .action(function(path) {
        init(path);
    });

program
    .command("build")
    .description("Build resources and scripts for all platforms")
    .action(function() {
        build();
    });

program
    .command("watch")
    .description("Starts a watcher for scripts")
    .action(function() {
        watch();
    });

program
    .command("*")
    .action(function() {
        program.outputHelp();
    });

program.parse(process.argv);