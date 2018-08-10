'use strict'

const log = require('debug')('libp2p:webext-tcp:noop')

module.exports = (err) => { if (err) log(err) }
