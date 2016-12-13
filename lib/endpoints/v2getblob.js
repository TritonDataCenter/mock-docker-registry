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


/*
 * GetBlob
 * https://docs.docker.com/registry/spec/api/#pulling-a-layer
 * GET /v2/$repo/blobs/$digest
 */
function endpointV2GetBlob(req, res, next) {
    res.header('docker-distribution-api-version', 'registry/2.0');

    var rar = drc.parseRepoAndRef(req.params.repo + '@' + req.params.digest);
    req.log.info({rar: rar}, 'V2GetBlob rar');

    req.app.db.v2CreateBlobReadStream({
        rar: rar
    }, function (err, stream) {
        if (err) {
            next(new VError({name: 'DBError', cause: err},
                'error getting blob'));
            return;
        } else if (!stream) {
            res.send(404);
            next();
        } else {
            // TODO: Not sure about possible need for pause/resume.
            var onceNext = once(next);
            stream.on('end', function () {
                onceNext();
            })
            stream.on('error', function (streamErr) {
                if (streamErr.code === 'ENOENT') {
                    var err = new WError({
                        name: 'ResourceNotFoundError',
                        cause: streamErr
                    }, '%s %s blob not found', rar.remoteName, rar.digest);
                    err.statusCode = 404;
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
    // TODO: cache headers and conditional request handling
    //      E.g. from IMGAPI: resSetImageFileCacheHeaders,
    //      restify.conditionalRequest(),
    // TODO: range gets
    app.server.get({path: '/v2/:repo/blobs/:digest', name: 'V2GetBlob'},
        endpointV2GetBlob);
};
