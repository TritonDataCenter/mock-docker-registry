/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016 Joyent, Inc.
 */

/*
 * A singleton `Database` object to manage Docker Registry data in its own
 * flat file storage.
 *
 * # v2 API file layout
 *
 *      $dataDir/v2/
 *          repos/
 *              $repo/
 *                  $tag.manifest
 *          blobs/
 *              $digest.blob
 */

var assert = require('assert-plus');
var fs = require('fs');
var path = require('path');
var VError = require('verror').VError;


// ---- globals

var DIGEST_RE = /^sha256:[a-f0-9]{64}$/;


// ---- internal support stuff


// ---- Database class

function Database(opts) {
    assert.object(opts, 'opts');
    assert.object(opts.log, 'opts.log');
    assert.string(opts.dataDir, 'opts.dataDir');

    this.log = opts.log;
    this.dataDir = opts.dataDir;
}


Database.prototype._readFile = function _readFile(p, opts, cb) {
    fs.readFile(p, opts, function _(readErr, content) {
        if (readErr) {
            if (readErr.code === 'ENOENT') {
                cb(null, null);
            } else {
                cb(readErr, null);
            }
        } else {
            cb(null, content);
        }
    });
};


/*
 * @param {Object} opts
 *      - {Object} opts.rar - Required. The object from docker-registry-client
 *        `parseRepoAndRef`.
 * @param {Function} cb - `function (err, manifest)`
 *      Note that "not found" is `cb(null, null)` -- i.e. not an error.
 */
Database.prototype.v2GetManifest = function v2GetManifest(opts, cb) {
    var p;

    assert.object(opts.rar, 'opts.rar');

    if (opts.rar.digest) {
        cb(new VError('database does not support GetManifest by digest'));
        return;
    }

    p = path.resolve(this.dataDir, 'v2', 'repos', opts.rar.remoteName,
        'manifests', opts.rar.tag);
    this._readFile(p, {encoding: 'utf8'}, cb);
};

/*
 * @param {Object} opts
 *      - {Object} opts.rar - Required. The object from docker-registry-client
 *        `parseRepoAndRef`.
 * @param {Function} cb - `function (err, stream)`
 */
Database.prototype.v2CreateBlobReadStream
= function v2CreateBlobReadStream(opts, cb) {
    var p;

    assert.object(opts.rar, 'opts.rar');
    assert.string(opts.rar.digest, 'opts.rar.digest');
    assert.ok(DIGEST_RE.test(opts.rar.digest),
        'invalid digest: ' + opts.rar.digest);

    p = path.resolve(this.dataDir, 'v2', 'repos', opts.rar.remoteName,
        'blobs', opts.rar.digest);
    cb(null, fs.createReadStream(p));
};


module.exports = Database;
