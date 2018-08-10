/* eslint-env webextensions */
'use strict'

const { Connection } = require('interface-connection')
const log = require('debug')('libp2p:webext-tcp:transport')
const pull = require('pull-stream')
const noop = require('./noop')
const WebExtTcpListener = require('./WebExtTcpListener')

class WebExtTcpTransport {
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

    browser.TCPSocket.connect({ host, port })
      .then(async client => {
        await client.opened
        log(`connected ${addr}`)
        return client
      })
      .then(client => {
        const stream = pull.asyncMap(async (data, cb) => {
          try {
            await client.write(data)
          } catch (err) {
            return cb(err)
          }

          let res

          try {
            res = await client.read()
          } catch (err) {
            return cb(err)
          }

          cb(null, res)
        })

        conn.setInnerConn(stream)
        cb()
      })
      .catch(cb)

    return conn
  }

  createListener (opts, handler) {
    if (typeof opts === 'function') {
      handler = opts
      opts = {}
    }

    opts = opts || {}

    return new WebExtTcpListener(handler, opts)
  }
}

module.exports = WebExtTcpTransport
