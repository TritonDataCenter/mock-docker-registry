/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016, Joyent, Inc.
 */

/*
 * The logging plan:
 *
 * - We use Bunyan for logging.
 * - We log level $config.logLevel (typically INFO) to stdout.
 * - We rely on a service system (e.g. SMF on SmartOS) to direct logs to
 *   a log file, and separate processing (e.g. logadm on SmartOS) to handle
 *   rotation.
 *
 * Dev notes:
 * - This module borrows from sdcadm's lib/logging.js
 *   and fwadm's /usr/fw/lib/util/log.js
 */

var assert = require('assert-plus');
var bunyan = require('bunyan');
var restify = require('restify');


/**
 * Create a logger the way this app likes it.
 *
 * @param config {Object} The app config.
 */
function createLogger(config) {
    assert.object(config, 'config');
    assert.object(config.logging, 'config.logging');
    assert.optionalBool(config.logging.src, 'config.logging.src');

    return bunyan.createLogger({
        name: 'mock-docker-registry',
        serializers: restify.bunyan.serializers,
        src: Boolean(config.logging.src),
        level: config.logging.level || bunyan.INFO
    });
}


module.exports = {
    createLogger: createLogger
};
