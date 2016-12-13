# a mock Docker Registry API

This repository is part of the Joyent Triton project. See the [contribution
guidelines](https://github.com/joyent/triton/blob/master/CONTRIBUTING.md) --
*Triton does not use GitHub PRs* -- and general documentation at the main
[Triton project](https://github.com/joyent/triton) page.


This is a mock Docker Registry API intended to be used for Triton Docker
(https://github.com/joyent/sdc-docker) testing and developent. It is a node.js
API server (implemented using [restify](restify.com)).


## Current status

Just starting this out. Nothing is functional yet.


## Install

    npm install mock-docker-registry


## Development

### Testing

    make test

### Commits

Before commit, ensure that the following checks are clean:

    make prepush

Also see the note at the top that cr.joyent.us is used for code review and
pushing comits to master.

### Releases

Changes with possible user impact should:

1. Add a note to the changelog (CHANGES.md).
2. Bump the package version appropriately.
3. Once merged to master (via cr.joyent.us), the new version should be tagged
   and published to npm via:

        make cutarelease

   To list to npm accounts that have publish access:

        npm owner ls mock-docker-registry

