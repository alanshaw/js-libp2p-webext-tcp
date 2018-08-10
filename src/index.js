/* eslint-env webextensions */

'use strict'

const log = require('debug')('libp2p:webext-tcp')
const EventEmitter = require('events').EventEmitter
const WebExtTcpTransport = require('./WebExtTcpTransport')
const noop = require('./noop')

let reason

class DummyTransport {
  dial (addr, opts, cb) {
    if (typeof opts === 'function') cb = opts
    cb = cb || noop
    setTimeout(() => cb(new Error(`unable to dial ${addr} ${reason}`)))
  }
  createListener (opts, handler) {
    if (typeof opts === 'function') handler = opts
    return new DummyListener()
  }
}

class DummyListener extends EventEmitter {
  listen (addr, cb) {
    cb = cb || noop
    setTimeout(() => cb(new Error(`unable listen on ${addr} ${reason}`)))
  }
  getAddrs (cb) {
    cb(null, [])
  }
  close (opts, cb) {
    if (typeof opts === 'function') cb = opts
    cb = cb || noop
    setTimeout(cb)
    this.emit('close')
  }
}

if (typeof browser === 'undefined') {
  reason = 'not in web extension'
  log(reason)
  module.exports = DummyTransport
} else if (!browser.TCPSocket) {
  reason = 'browser.TCPSocket unavailable'
  log(reason)
  module.exports = DummyTransport
} else {
  module.exports = WebExtTcpTransport
}
