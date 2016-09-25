"use strict";

var requestify = require("requestify");
var base64 = require("./../app/js/framework/base64");
var http = require("http");
var https = require("https");
var url = require("url");
var _request = require("request");

module.exports = {
    request: function request(uri, method, data, headers, rawResponse, cb) {
        var method = method || "GET";
        var data = data || {};
        var headers = headers || {};
        var rawResponse = rawResponse || false;

        logger.i("Calling", uri);

        if (rawResponse) {
            _request({ uri: uri, encoding: null }, function (error, response, body) {
                if (error) {
                    cb(true, null);
                } else {
                    __buffersManager.create(body.toString("base64")).then(function (id) {
                        cb(false, id);
                    }).catch(function (e) {
                        cb(true, e);
                    });
                }
            });
        } else {
            requestify.request(uri, {
                method: method,
                body: data,
                headers: headers,
                cookies: {}
            }).then(function (response) {
                logger.i("Response", response.getCode());

                var body = response.body;

                cb(false, body);
            }).catch(function (e) {
                logger.e(e);
                cb(true);
            });
        }
    }
};