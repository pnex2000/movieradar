#!/bin/sh
(cd front-js-src/ && ../node_modules/.bin/babel *.js --out-dir ../front/js/)
