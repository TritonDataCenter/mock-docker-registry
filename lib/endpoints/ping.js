/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016, Joyent, Inc.
 */

/*
 * /ping endpoint
 */

'use strict';


function endpointPing(req, res, next) {
    var data = {
        ping: 'pong'
    };
    res.send(data);
    next();
}


module.exports = function mount(app) {
    app.server.get({path: '/ping', name: 'Ping'}, endpointPing);
};
