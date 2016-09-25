"use strict";

var buffers = require("../app/js/aj/buffers");

module.exports = {
    create: function create(data) {
        return buffers.create(data);
    },

    read: function read(id) {
        return buffers.read(id);
    },

    destroy: function destroy(id) {
        return buffers.destroy(id);
    }
};