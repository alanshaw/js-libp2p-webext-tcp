/* eslint-env webextensions */
'use strict'

const { EventEmitter } = require('events')
const log = require('debug')('libp2p:webext-tcp:listener')
const pull = require('pull-stream')
const { Connection } = require('interface-connection')
const noop = require('./noop')

class WebExtTcpListener extends EventEmitter {
  constructor (handler) {
    super()
    this._handler = handler
    this._server = null
    this._addrs = []
  }

  async listen (addr, cb) {
    log(`listen ${addr}`)

    cb = cb || noop

    let server

    try {
      const { port } = addr.nodeAddress()
      server = await browser.TCPSocket.listen({ port })
    } catch (err) {
      return cb(err)
    }

    this._server = server
    this._addrs = [addr]

    log(`listening ${addr}`, server)
    cb()
    this.emit('listening')

    for await (const client of server.connections) {
      this._onConnect(client)
    }
  }

  _onConnect (client) {
    log('connection', client)
    const conn = new Connection()
    this._handler(conn)
    this.emit('connection', conn)
  }

  getAddrs (cb) {
    cb(null, this._addrs)
  }

  async close (opts, cb) {
    log('close')

    if (typeof opts === 'function') {
      cb = opts
      opts = opts || {}
    }

    if (this._server) {
      try {
        await this._server.close()
        this._server = null
      } catch (err) {
        return cb(err)
      }
    }

    this._addrs = []

    cb()
    this.emit('close')
  }
}

module.exports = WebExtTcpListener