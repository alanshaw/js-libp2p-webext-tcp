/* eslint-env webextensions */
'use strict'

const { EventEmitter } = require('events')
const log = require('debug')('libp2p:webext-tcp:listener')
const { Connection } = require('interface-connection')
const noop = require('./noop')
const ClientSocketPullStream = require('./ClientSocketPullStream')
const Addrs = require('./Addrs')

class WebExtTcpListener extends EventEmitter {
  constructor (handler) {
    super()
    this._handler = handler
    this._server = null
    this._addrs = new Addrs()
  }

  async listen (addr, cb) {
    log(`listen ${addr}`)

    cb = cb || noop

    let server
    let port

    try {
      port = parseInt(addr.nodeAddress().port)
      server = await browser.TCPSocket.listen({ port })
    } catch (err) {
      return cb(err)
    }

    this._server = server

    log(`listening ${addr}`)
    cb()
    this.emit('listening')

    for await (const client of server.connections) {
      this._onConnect(client)
    }
  }

  _onConnect (client) {
    log('connection', client)
    const addr = `/ip${client.host.includes(':') ? 6 : 4}/${client.host}/tcp/${client.port}`
    const stream = ClientSocketPullStream(`listened:${addr}`, client)
    const conn = new Connection(stream)
    this._handler(conn)
    this.emit('connection', conn)
  }

  setAddrs (addrs) {
    this._addrs.set(addrs)
    return this
  }

  getAddrs (cb) {
    const addrs = this._addrs.get()
    if (!addrs.length) return this._addrs.once('addrs', addrs => cb(null, addrs))
    setTimeout(() => cb(null, addrs))
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

    this._addrs = new Addrs()

    cb()
    this.emit('close')
  }
}

module.exports = WebExtTcpListener
