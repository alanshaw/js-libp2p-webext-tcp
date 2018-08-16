/* eslint-env webextensions */
'use strict'

const { Connection } = require('interface-connection')
const log = require('debug')('libp2p:webext-tcp:transport')
const noop = require('./noop')
const WebExtTcpListener = require('./WebExtTcpListener')
const ClientSocketPullStream = require('./ClientSocketPullStream')

class WebExtTcpTransport {
  constructor () {
    this._listeners = []
    this._interfaceAddrs = []
  }

  dial (addr, opts, cb) {
    log(`dial ${addr}`)

    if (typeof opts === 'function') {
      cb = opts
      opts = {}
    }

    opts = opts || {}
    cb = cb || noop

    const { address: host, port } = addr.nodeAddress()
    const conn = new Connection()

    browser.TCPSocket.connect({ host, port: parseInt(port) })
      .then(async client => {
        await client.opened
        log(`connected ${addr}`)
        return client
      })
      .then(client => {
        const stream = ClientSocketPullStream(`dialed:${addr}`, client)
        conn.setInnerConn(stream)
        cb()
      })
      .catch(cb)

    return conn
  }

  createListener (options, handler) {
    if (typeof options === 'function') {
      handler = options
      options = {}
    }

    options = options || {}
    options.interfaceAddrs = options.interfaceAddrs || this._interfaceAddrs

    const listener = new WebExtTcpListener(handler, options)

    listener.on('close', () => {
      this._listeners = this._listeners.filter(l => l !== listener)
    })

    this._listeners = this._listeners.concat(listener)

    return listener
  }

  // Set the available interface addresses
  // These are all /ip4/x or /ip6/x style multiaddrs (no port)
  setInterfaceAddrs (addrs) {
    addrs = Array.from(addrs)
    this._interfaceAddrs = addrs
    this._listeners.forEach(l => l.setInterfaceAddrs(addrs))
  }

  filter (addrs) {
    addrs = Array.isArray(addrs) ? addrs : [addrs]
    return addrs.filter(addr => /\/tcp\/[0-9]+/.test(addr.toString()))
  }
}

WebExtTcpTransport.tag = 'webext-tcp'

module.exports = WebExtTcpTransport
