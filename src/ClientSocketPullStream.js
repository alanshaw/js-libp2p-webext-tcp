'use strict'
const debug = require('debug')

module.exports = (id, client) => {
  const log = debug(`libp2p:webext-tcp:socket:${id}`)

  const sink = read => {
    read(null, async function next (end, data) {
      if (end) {
        if (end === true) log('sink end')
        else log('sink error', end)
        return client.close()
      }

      try {
        log('write', data)
        // ClientSocket.write accepts an ArrayBuffer
        const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
        await client.write(buffer)
      } catch (err) {
        log('write error', err)
        return read(err)
      }

      read(null, next)
    })
  }

  const source = async (end, cb) => {
    if (end) {
      if (end === true) log('source end')
      else log('source error', end)
      return client.close()
    }

    let data

    try {
      data = await client.read()
      log('read', data)
    } catch (err) {
      log('read error', err)
      return cb(err)
    }

    cb(null, data)
  }

  return { sink, source }
}
