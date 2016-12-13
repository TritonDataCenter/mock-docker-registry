/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016, Joyent, Inc.
 */

'use strict';

var drc = require('docker-registry-client');
var once = require('once');
var WError = require('verror').WError;


var STATUS_404 = 404;


/*
 * GetBlob
 * https://docs.docker.com/registry/spec/api/#pulling-a-layer
 * GET /v2/$repo/blobs/$digest
 */
function endpointV2GetBlob(req, res, next) {
    var rar = drc.parseRepoAndRef(req.params.repo + '@' + req.params.digest);
    req.log.info({rar: rar}, 'V2GetBlob rar');

    res.header('docker-distribution-api-version', 'registry/2.0');

    req.app.db.v2CreateBlobReadStream({
        rar: rar
    }, function createdStream(createErr, stream) {
        var err;
        var onceNext = once(next);

        if (createErr) {
            onceNext(new WError({name: 'DBError', cause: createErr},
                'error getting blob'));
            return;
        } else if (!stream) {
            res.send(STATUS_404);
            onceNext();
        } else {
            // Dev Note: Not sure about possible need for pause/resume.
            stream.on('end', function onEnd() {
                onceNext();
            });
            stream.on('error', function onError(streamErr) {
                if (streamErr.code === 'ENOENT') {
                    err = new WError({
                        name: 'ResourceNotFoundError',
                        cause: streamErr
                    }, '%s %s blob not found', rar.remoteName, rar.digest);
                    err.statusCode = STATUS_404;
                    onceNext(err);
                } else {
                    onceNext(new WError({
                        cause: streamErr
                    }, 'error getting %s %s blob', rar.remoteName, rar.digest));
                }
            });
            stream.pipe(res);
        }
    });
}


module.exports = function mount(app) {
    app.server.get({path: '/v2/:repo/blobs/:digest', name: 'V2GetBlob'},
        endpointV2GetBlob);
};
