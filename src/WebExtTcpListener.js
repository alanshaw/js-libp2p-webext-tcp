/* eslint-env webextensions */
'use strict'

const { EventEmitter } = require('events')
const log = require('debug')('libp2p:webext-tcp:listener')
const { Connection } = require('interface-connection')
const noop = require('./noop')
const ClientSocketPullStream = require('./ClientSocketPullStream')
const Addrs = require('./Addrs')

class WebExtTcpListener extends EventEmitter {
  constructor (handler, options) {
    super()
    options = options || {}
    this._handler = handler
    this._server = null
    this._addr = null
    this._interfaceAddrs = new Addrs()

    if (options.interfaceAddrs && options.interfaceAddrs.length) {
      this.setInterfaceAddrs(options.interfaceAddrs)
    }
  }

  async listen (addr, cb) {
    log(`listen ${addr}`)

    cb = cb || noop

    let server
    let port

    try {
      port = parseInt(addr.toString().replace('/tcp/', ''))
      server = await browser.TCPSocket.listen({ port })
    } catch (err) {
      return cb(err)
    }

    this._server = server
    this._addr = addr

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

  setInterfaceAddrs (addrs) {
    log('interface addrs', addrs.map(a => a.toString()))
    this._interfaceAddrs.set(addrs)
  }

  getAddrs (cb) {
    if (!this._addr) return setTimeout(() => cb(null, []))

    const ifAddrs = this._interfaceAddrs.get()
    const encapsulateAll = addrs => addrs.map(a => a.encapsulate(this._addr))

    // If we have no interface addresses yet, wait for them to come in
    if (!ifAddrs.length) {
      return this._interfaceAddrs.once('addrs', addrs => {
        cb(null, encapsulateAll(addrs))
      })
    }

    setTimeout(() => cb(null, encapsulateAll(ifAddrs)))
  }

  async close (opts, cb) {
    log('close')

    if (typeof opts === 'function') {
      cb = opts
      opts = opts || {}
    }

    this._addr = null
    this._interfaceAddrs = new Addrs()

    if (this._server) {
      const server = this._server
      this._server = null

      try {
        await server.close()
      } catch (err) {
        setTimeout(() => this.emit('close', err))
        return cb(err)
      }
    }

    setTimeout(() => this.emit('close'))
    cb()
  }
}

module.exports = WebExtTcpListener
