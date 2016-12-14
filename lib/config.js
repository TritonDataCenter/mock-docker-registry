#!/usr/bin/env node
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016 Joyent, Inc.
 */

/*
 * Config loading and validation for mock-docker-registry-client.
 *
 * Module usage:
 *      var mod_config = require('./config');
 *      mod_config.loadConfig({...}, function (err, config) {
 *          // ...
 *      });
 *
 * CLI usage:
 *      $ node lib/config.js
 *      ... emits the full merged and computed config ...
 *      $ node lib/config.js KEY
 *      ... emits the value of KEY (in json-y form, i.e. quotes removed from a
 *      string) ...
 */

var assert = require('assert-plus');
var dashdash = require('dashdash');
var fs = require('fs');
var mod_path = require('path');
var vasync = require('vasync');
var VError = require('verror').VError;


// ---- globals

var DEFAULT_PATH = mod_path.resolve(__dirname, '../etc/config.json');
var CONFIG_INDENT = 4;


// ---- internal support

/*
 * lookup the property "str" (given in dot-notation) in the object "obj".
 * "c" is optional and may be set to any delimiter (defaults to dot: ".")
 *
 * Note: lifted from node-tabula.
 */
function dottedLookup(obj, str, c_) {
    var c = (c_ === undefined ? '.' : c_);
    var dot;
    var dots = str.split(c);
    var i;
    var o = obj;
    var s = [];

    for (i = 0; i < dots.length; i++) {
        dot = dots[i];
        s.push(dot);
        if (!o.hasOwnProperty(dot)) {
            throw new Error('no property ' + s.join(c) + ' found');
        }
        o = o[dot];
    }

    return o;
}


function validateConfigSync(config) {
    assert.finite(config.port, 'config.port');
    assert.string(config.address, 'config.address');

    assert.object(config.logging, 'config.logging');
    assert.string(config.logging.level, 'config.logging.level');
    assert.optionalBool(config.logging.src, 'config.logging.src');

    assert.bool(config.tls, 'config.tls');
    if (config.tls) {
        assert.string(config.tlsKeyPath, 'config.tlsKeyPath');
        assert.string(config.tlsCertPath, 'config.tlsCertPath');
    }

    assert.string(config.dataDir, 'config.dataDir');
}

/*
 * Some config vars can be specified with a relative path. They are interpreted
 * as relative to the config file itself. Resolve those.
 */
function resolveRelpaths(config, dir) {
    var POSSIBLE_RELPATHS = ['dataDir', 'tlsKeyPath', 'tlsCertPath'];

    POSSIBLE_RELPATHS.forEach(function _(k) {
        if (config.hasOwnProperty(k)) {
            config[k] = mod_path.resolve(dir, config[k]);
        }
    });
}


// ---- config loading

/**
 * Load config.
 *
 * This loads factory settings (etc/defaults.json), then if `configPath` is
 * given that file, otherwise etc/config.json (DEFAULT_PATH) if it exists.
 *
 * @param opts.log {Bunyan Logger} Optional.
 * @param opts.path {String} Optional. Path to JSON config file to load.
 *      If not given, then the default config path (DEFAULT_PATH) is attempted.
 * @param cb {Function} `function (err, config)`
 */
function loadConfig(opts, cb) {
    var configPath;
    var config;

    assert.object(opts, 'opts');
    assert.func(cb, 'cb');
    assert.optionalObject(opts.log, 'opts.log');
    assert.optionalString(opts.path, 'opts.path');

    vasync.pipeline({funcs: [
        function decideConfigPath(_, next) {
            if (opts.path) {
                configPath = opts.path;
                next();
            } else {
                fs.exists(DEFAULT_PATH, function checkedIt(exists) {
                    if (exists) {
                        configPath = DEFAULT_PATH;
                    }
                    next();
                });
            }
        },

        function loadDefaults(_, next) {
            var defaultsPath = mod_path.resolve(__dirname, '..', 'etc',
                'defaults.json');
            if (opts.log) {
                opts.log.info({defaultsPath: defaultsPath},
                    'load config defaults');
            }
            fs.readFile(defaultsPath, {
                encoding: 'utf8'
            }, function readIt(err, data) {
                if (err) {
                    next(err);
                } else {
                    try {
                        config = JSON.parse(data);
                    } catch (parseErr) {
                        next(VError(parseErr,
                            'could not parse ' + defaultsPath));
                        return;
                    }

                    resolveRelpaths(config, mod_path.dirname(defaultsPath));
                    next();
                }
            });
        },

        function loadConfigPath(_, next) {
            if (!configPath) {
                next();
                return;
            }

            if (opts.log) {
                opts.log.info({configPath: configPath}, 'load config path');
            }
            fs.readFile(configPath, {
                encoding: 'utf8'
            }, function readIt(err, data) {
                var extraConfig;

                if (err) {
                    next(err);
                } else {
                    try {
                        extraConfig = JSON.parse(data);
                    } catch (parseErr) {
                        next(VError(parseErr,
                            'could not parse ' + configPath));
                        return;
                    }
                    Object.keys(extraConfig).forEach(function aKey(key) {
                        config[key] = extraConfig[key];
                    });

                    resolveRelpaths(config, mod_path.dirname(configPath));

                    next();
                }
            });
        },

        function validate(_, next) {
            try {
                validateConfigSync(config);
            } catch (valErr) {
                next(VError(valErr, 'invalid config'));
                return;
            }
            next();
        }

    ]}, function loadConfigDone(err) {
        cb(err, config);
    });
}


// ---- mainline

/* eslint-disable no-console */
function main(argv) {
    var key;
    var options;
    var opts;
    var parser;

    assert.arrayOfString(argv, 'argv');

    options = [
        {
            names: ['help', 'h'],
            type: 'bool',
            help: 'Print this help and exit.'
        },
        {
            names: ['file', 'f'],
            type: 'string',
            help: 'Config file path.',
            helpArg: 'CONFIG-PATH'
        }
    ];
    parser = dashdash.createParser({options: options});
    try {
        opts = parser.parse(argv);
    } catch (e) {
        console.error('lib/config.js: error: %s', e.message);
        process.exit(1);
    }

    if (opts.help) {
        console.log([
            'usage: node .../lib/config.js [OPTIONS] [KEY]',
            'options:',
            parser.help().trimRight()
        ].join('\n'));
        process.exit(0);
    }

    if (opts._args.length === 1) {
        key = opts._args[0];
    } else if (opts._args.length === 0) {
        key = null;
    } else {
        console.error('lib/config.js: error: too many args: %s',
            opts._args.join(' '));
        process.exit(1);
    }

    loadConfig({path: opts.file}, function loadedConfig(err, config) {
        var val;

        if (err) {
            console.error('lib/config.js: error: %s', err.stack);
            process.exit(1);
        }
        if (key) {
            val = dottedLookup(config, key);
            if (typeof (val) === 'string') {
                console.log(val);
            } else {
                console.log(JSON.stringify(val, null, CONFIG_INDENT));
            }
        } else {
            console.log(JSON.stringify(config, null, CONFIG_INDENT));
        }
    });
}
/* eslint-enable no-console */

if (require.main === module) {
    main(process.argv);
}


// ---- exports

module.exports = {
    DEFAULT_PATH: DEFAULT_PATH,
    loadConfig: loadConfig
};
