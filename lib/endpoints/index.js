/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016, Joyent, Inc.
 */

'use strict';

var fs = require('fs');

/*
 * Mount all the endpoint files in this dir.
 */
module.exports = function mount(app) {
    var files = fs.readdirSync(__dirname);

    var endpointsFiles = files.filter(function _(name) {
        if (name === 'index.js') {
            return false;
        } else if (/\.js$/.test(name)) {
            return true;
        } else {
            return false;
        }
    });

    endpointsFiles.forEach(function mountEndpointFile(file) {
        app.log.debug({file: file}, 'mounting endpoint file');
        require('./' + file)(app); // eslint-disable-line global-require
    });
};
