/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016, Joyent, Inc.
 */

/*
 * The mock-docker-registry app. There is a singleton of this `App` class for
 * a running server.
 */

'use strict';

var assert = require('assert-plus');
var format = require('util').format;
var fs = require('fs');
var path = require('path');
var restify = require('restify');
var vasync = require('vasync');
var VError = require('verror').VError;

var Database = require('./database');
var logging = require('./logging');
var version = require('../package.json').version;



// ---- App

function App(opts) {
    assert.object(opts.config, 'opts.config');
    assert.string(opts.config._configDir, 'opts.config._configDir');
    assert.optionalObject(opts.log, 'opts.log');

    this.config = opts.config;
    this.log = opts.log || logging.createLogger(opts.config);

    this.db = new Database({
        log: this.log.child({component: 'db'}),
        dataDir: path.resolve(this.config._configDir, this.config.dataDir)
    });
}


App.prototype.init = function init(cb) {
    var self = this;

    var serverOpts = {
        name: 'mock-docker-registry/' + version,
        log: this.log,
        key: fs.readFileSync(
            path.resolve(this.config._configDir, self.config.tls.keyPath)),
        cert: fs.readFileSync(
            path.resolve(this.config._configDir, self.config.tls.certPath))
    };
    var server = this.server = restify.createServer(serverOpts);

    server.use(function (req, res, next) {
        // Headers we want for all responses.
        res.on('header', function onHeader() {
            var now = Date.now();
            res.header('Date', new Date());
            res.header('Server', server.name);
            res.header('Request-Id', req.getId());
            var t = now - req.time();
        });

        req.app = self;
        next();
    });

    server.use(restify.requestLogger());

    server.on('after', function (req, res, route, err) {
        // TODO: eventually probably want to skip logging all GETs
        var body = !(req.method === 'GET' &&
            Math.floor(res.statusCode / 100) === 2);

        // TODO(perf): For speed might just want a custom leaner audit logger.
        restify.auditLogger({
            log: req.log.child({route: route && route.name}, true),
            body: body
        })(req, res, route, err);
    });

    require('./endpoints')(self);

    cb();
};


App.prototype.start = function start(cb) {
    var self = this;

    var startPipeline = vasync.pipeline({funcs: [
        function init(_, next) {
            self.init(next);
        },
        function server(_, next) {
            var port = (self.config.port !== undefined
                ? self.config.port
                : (self.config.tls ? 443 : 80));
            self.server.listen(port, '0.0.0.0', function () {
                var addr = self.server.address();
                self.log.info({addr: addr}, 'listening at %s://%s%s',
                    self.config.tls ? 'https' : 'http',
                    self.config.dns || addr.address,
                    self.config.port !== undefined
                        ? ':' + self.config.port : '');
                next();
            });
        }
    ]}, cb);
};


module.exports = App;
