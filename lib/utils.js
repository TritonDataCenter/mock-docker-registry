/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016 Joyent, Inc.
 */

/*
 * Utilities small enough to not have their own file or module.
 */


function objCopy(obj, target) {
    var targ = target || {};

    Object.keys(obj).forEach(function _(k) {
        targ[k] = obj[k];
    });
    return targ;
}


// ---- exports

module.exports = {
    objCopy: objCopy
};
