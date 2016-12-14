# mock-docker-registry changelog

## not yet released

- Move config loading to a module. Put defaults in "etc/defaults.json" and
  no longer require a separate config file (still defaults to "etc/config.json").
  Change default config to only listen on 127.0.0.1.

## 0.1.0

First release.  After manually setting up the "dataDir" as follows, `docker
pull $ip:4444/alpine` works.  It is a start.

    $ find data
    data
    data/v2
    data/v2/repos
    data/v2/repos/library
    data/v2/repos/library/alpine
    data/v2/repos/library/alpine/blobs
    data/v2/repos/library/alpine/blobs/sha256:3690ec4760f95690944da86dc4496148a63d85c9e3100669a318110092f6862f
    data/v2/repos/library/alpine/manifests
    data/v2/repos/library/alpine/manifests/latest
