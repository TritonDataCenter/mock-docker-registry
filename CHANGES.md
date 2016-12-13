# mock-docker-registry changelog

## not yet released

(nothing yet)

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
