const config = require('../splunk.config.json')
const fs = require('fs')
const crypto = require('crypto')
const path = require('path')
const watch = require('node-watch')
const EventEmitter = require('events')
const projectRoot = path.resolve(__dirname, '../')

const filetypes = config.watcher.fileTypes
const watchList = config.watcher.directorys
let instance = null
let running = false

class Watcher extends EventEmitter {
  constructor () {
    super()
    if (!instance) {
      instance = new Proxy(this, {
        get (target, key) {
          if (running || key === 'start') {
            return target[key]
          } else {
            return () => undefined
          }
        }
      })
    }
    this.filterObject = {}
    this.filetypeList = []
    this.lock = false
    this.fileMap = new Map()
    this.createFilterObject()
    this.createFiletypeList()
    return instance
  }

  checksum (str, algorithm, encoding) {
    return crypto
      .createHash(algorithm || 'sha256')
      .update(str, 'utf8')
      .digest(encoding || 'hex')
  }

  createFilterObject () {
    // @dev create object full of regexes
    Object.keys(watchList).forEach((key) => {
      this.filterObject[key] = []
      watchList[key].forEach((value) => {
        this.filterObject[key].push(new RegExp('^' + value))
      })
    })
  }

  createFiletypeList () {
    // @dev create object full of regexes
    for (let i = 0; i < filetypes.length; i++) {
      this.filetypeList.push(new RegExp(filetypes[i] + '$'))
    }
  }

  isFilePathMatch (str) {
    // @dev check if file is in our file path object
    str = str.replace(projectRoot, '')
    const keys = Object.keys(this.filterObject)
    for (let i = 0; i < keys.length; i++) {
      for (let i2 = 0; i2 < this.filterObject[keys[i]].length; i2++) {
        if (this.filterObject[keys[i]][i2].test(str)) {
          return { value: true, key: keys[i] }
        }
      }
    }
    return { value: false, key: undefined }
  }

  isFileTypeMatch (str) {
    // @dev check if file matches a file type in our list
    str = str.replace(projectRoot, '')
    let isOfFileType = false
    for (let i = 0; i < this.filetypeList.length; i++) {
      if (this.filetypeList[i].test(str)) {
        isOfFileType = true
        break
      }
    }
    return isOfFileType
  }

  startLockTimer () {
    this.lock = true
    setTimeout(() => {
      this.lock = false
    }, config.watcher.lockTime)
  }

  hasFileChanged (path) {
    // @dev read in file and create hash to compare to previous
    try {
      const data = fs.readFileSync(path)
      const checksum = this.checksum(data)
      // @dev check filemap to see if we should update
      if (this.fileMap.get(path) !== checksum) {
        // @dev update fileMap with checksum and emit
        this.fileMap.set(path, checksum)
        return true
      } else {
        return false
      }
    } catch (err) {
      console.error(err)
    }
  }

  filter (str) {
    return !this.lock && this.isFileTypeMatch(str) && this.isFilePathMatch(str).value
  }

  close () {
    this.watcher.close()
    running = false
    return true
  }

  start () {
    return new Promise((resolve, reject) => {
      running = true
      this.watcher = watch(projectRoot,
        { recursive: true, filter: str => this.filter(str) },
        (eventType, filename) => {
          // @dev May posibly need to decrease the timer or check if key === 'urReload'
          // if the build process happens faster then our timeout
          if (!this.lock) {
            this.startLockTimer()
            const key = this.isFilePathMatch(filename).key
            if (this.hasFileChanged(filename) || key === 'uiReload') {
              console.log('Key & Filename', key, filename)
              this.emit(key, filename)
            }
          }
        })
      this.emit('watcherReady')
      resolve(true)
    })
  }
}
module.exports = new Watcher()
