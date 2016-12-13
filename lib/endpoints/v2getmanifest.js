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
var VError = require('verror').VError;


var LOOKS_LIKE_DIGEST = /^sha256:[a-f0-9]{64}$/;
var STATUS_404 = 404;


/*
 * https://docs.docker.com/registry/spec/api/#pulling-an-image-manifest
 */
function endpointV2GetManifest(req, res, next) {
    var rar;
    if (LOOKS_LIKE_DIGEST.test(req.params.ref)) {
        rar = drc.parseRepoAndRef(req.params.repo + '@' + req.params.ref);
    } else {
        rar = drc.parseRepoAndRef(req.params.repo + ':' + req.params.ref);
    }
    req.log.info({rar: rar}, 'V2GetManifest rar');

    res.header('docker-distribution-api-version', 'registry/2.0');

    req.app.db.v2GetManifest({
        rar: rar
    }, function gotManifest(err, manifest) {
        var errBody;

        if (err) {
            next(new VError({name: 'DBError', cause: err},
                'error getting manifest'));
        } else if (!manifest) {
            errBody = {
                errors: [
                    {
                        code: 'MANIFEST_UNKNOWN',
                        message: 'manifest unknown',
                        detail: {
                            Name: rar.remoteName,
                            Tag: rar.tag,
                            Revision: rar.digest
                        }
                    }
                ]
            };
            res.status(STATUS_404);
            res.send(errBody);
            next();
        } else {
            res.setHeader('content-type',
                'application/vnd.docker.distribution.manifest.v1+prettyjws');
            res.setHeader('docker-content-digest',
                drc.digestFromManifestStr(manifest));
            res.send(manifest);
            next();
        }
    });
}


module.exports = function mount(app) {
    app.server.get({path: '/v2/:repo/manifests/:ref', name: 'V2GetManifest'},
        endpointV2GetManifest);
};
