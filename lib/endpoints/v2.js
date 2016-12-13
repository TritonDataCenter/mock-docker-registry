/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016, Joyent, Inc.
 */

'use strict';


function endpointV2(req, res, next) {
    res.setHeader('docker-distribution-api-version', 'registry/2.0');
    res.setHeader('content-type', 'text/plain');
    res.send('');
    next();
}


module.exports = function mount(app) {
    /*
     * Restify's router.js#compileURL blows away the trailing '/'. I think that
     * is a bug. TODO: log it.
     */
    app.server.get({path: new RegExp('^/v2/$'), name: 'V2'}, endpointV2);
};
