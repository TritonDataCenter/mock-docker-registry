#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#

#
# Copyright 2016 Joyent, Inc.
#

#
# Vars, Tools, Files, Flags
#
NPM := $(shell which yarn >/dev/null 2>/dev/null && echo yarn || echo npm)
JS_FILES := $(shell find lib test -name "*.js") bin/mockdockregd


#
# Targets
#

all:
	$(NPM) install

.PHONY: distclean
distclean:
	rm -rf node_modules yarn.lock

.PHONY: test
test:
	#./node_modules/.bin/tape test/*.test.js
	@echo no tests yet

.PHONY: check
check:
	./node_modules/.bin/eslint $(JS_FILES)

.PHONY: devrun
devrun:
	./node_modules/.bin/nodemon -w lib bin/mockdockregd | bunyan

.PHONY: prepush
prepush: check test

# Ensure CHANGES.md and package.json have the same version.
.PHONY: versioncheck
versioncheck:
	@echo version is: $(shell cat package.json | json version)
	[[ `cat package.json | json version` == `grep '^## ' CHANGES.md | head -2 | tail -1 | awk '{print $$2}'` ]]

.PHONY: cutarelease
cutarelease: versioncheck
	[[ -z `git status --short` ]]  # If this fails, the working dir is dirty.
	@which json 2>/dev/null 1>/dev/null && \
	    ver=$(shell json -f package.json version) && \
	    name=$(shell json -f package.json name) && \
	    publishedVer=$(shell npm view -j $(shell json -f package.json name)@$(shell json -f package.json version) version 2>/dev/null) && \
	    if [[ -n "$$publishedVer" ]]; then \
		echo "error: $$name@$$ver is already published to npm"; \
		exit 1; \
	    fi && \
	    echo "** Are you sure you want to tag and publish $$name@$$ver to npm?" && \
	    echo "** Enter to continue, Ctrl+C to abort." && \
	    read
	ver=$(shell cat package.json | json version) && \
	    date=$(shell date -u "+%Y-%m-%d") && \
	    git tag -a "v$$ver" -m "version $$ver ($$date)" && \
	    git push --tags origin && \
	    npm publish
