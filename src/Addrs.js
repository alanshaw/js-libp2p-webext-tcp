const { EventEmitter } = require('events')

class Addrs extends EventEmitter {
  constructor () {
    super()
    this._addrs = []
  }

  get (addrs) {
    return this._addrs
  }

  set (addrs) {
    this._addrs = addrs
    this.emit('addrs', addrs)
  }
}

module.exports = Addrs
