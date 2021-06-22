'use strict'
const path = require('path')
const config = require('../splunk.config.json')
const projectRoot = path.resolve(__dirname, '../')
const fs = require('fs')
const remove = require('find-remove')
const archiver = require('archiver')
const archive = archiver('zip', { zlib: { level: 9 } })

class ConfWrapper {
  constructor (data) {
    this.path = data.path
    this.name = data.name
    this.ext = data.ext
    this.type = data.type
    this.cached = ''
    this.importFile()
    this.parseStanza()
    return new Proxy(this, {
      lastkey: null,
      that: this,
      get (target, key) {
        this.lastkey = key
        let prop
        if (key in this.that.stanzaJSON) {
          prop = this.that.stanzaJSON[key]
        } else {
          prop = target[key]
        }
        if (key === 'isProxy') {
          return true
        }
        if (typeof prop === 'undefined') {
          return
        }
        if (!prop.isProxy && typeof prop === 'object') {
          prop = new Proxy(prop, this)
        }
        return prop
      },
      set (target, key, value) {
        if (this.lastkey in this.that.stanzaJSON) {
          if (key in this.that.stanzaJSON[this.lastkey]) {
            target[key] = value
            this.that.JSONToStanza()
          } else {
            target[key] = value
          }
        } else {
          target[key] = value
        }

        return true
      }
    })
  }

  rexReplace (rex, value) {
    this.cached = this.cached.replace(rex, value)
    this.parseStanza()
  }

  changeKeys (data) {
    Object.keys(data).forEach((title, index) => {
      Object.keys(data[title]).forEach((key, index) => {
        this.stanzaJSON[title][key] = data[title][key]
      })
    })
    this.JSONToStanza()
  }

  parseStanza () {
    this.lines = this.cached.split('\n')
    const stanzaJSON = {
      startStanzaKey: {}
    }
    let current = 'startStanzaKey'
    for (let line = 0; line < this.lines.length; line++) {
      const matches = [...this.lines[line].trim().matchAll(/(?<stanza>^\[.+\]$)|(?<key>^.+?)\s*=\s*(?<value>.+)|(?<line>^.*$)/)][0]
      const groups = matches.groups
      if (groups.stanza) {
        current = groups.stanza.slice(1, -1)
        stanzaJSON[current] = {}
      } else if (groups.key && groups.value) {
        stanzaJSON[current][groups.key] = groups.value
      } else if (groups.line !== undefined) {
        stanzaJSON[current]['line' + line] = groups.line
      }
    }
    this.stanzaJSON = stanzaJSON
  }

  write () {
    fs.writeFileSync(this.path, this.cached.toString(), { encoding: 'utf8', flag: 'w' })
  }

  writeOriginal () {
    fs.writeFileSync(this.path, this.original.toString(), { encoding: 'utf8', flag: 'w' })
  }

  remove (args) {
    fs.unlinkSync(this.path)
  }

  JSONToStanza () {
    let cached = ''
    const titles = Object.keys(this.stanzaJSON)
    for (let i = 0; i < titles.length; i++) {
      if (titles[i] !== 'startStanzaKey') {
        cached = cached + '[' + titles[i] + ']' + '\n'
      }
      const test = Object.keys(this.stanzaJSON[titles[i]])
      for (let i2 = 0; i2 < test.length; i2++) {
        if (!this.stanzaJSON[titles[i]][test[i2]]) {
          cached = cached + '\n'
        } else if (/^line\d*$/.test(test[i2])) {
          cached = cached + this.stanzaJSON[titles[i]][test[i2]] + '\n'
        } else {
          cached = cached + test[i2] + ' = ' + this.stanzaJSON[titles[i]][test[i2]] + '\n'
        }
      }
    }
    this.cached = cached.replace(/\n*$/, '')
  }

  importFile () {
    this.original = fs.readFileSync(this.path).toString()
    this.cached = this.original
  }
}

class JSWrapper {
  constructor (data) {
    this.path = data.path
    this.name = data.name
    this.ext = data.ext
    this.type = data.type
    this.cached = ''
    this.importFile()
  }

  importFile () {
    this.original = fs.readFileSync(this.path).toString()
    this.cached = this.original
  }

  rexReplace (rex, value) {
    this.cached = this.cached.replace(rex, value)
  }

  write () {
    fs.writeFileSync(this.path, this.cached.toString(), { encoding: 'utf8', flag: 'w' })
  }

  writeOriginal () {
    fs.writeFileSync(this.path, this.original.toString(), { encoding: 'utf8', flag: 'w' })
  }

  remove () {
    fs.unlinkSync(this.path)
  }
}

class DirWrapper {
  constructor (data) {
    this.path = data.path
    this.name = data.name
    this.ext = data.ext
    this.type = data.type
    this.cached = ''
  }

  remove (args) {
    remove(this.path, args)
  }
}

class ConfigManipulator {
  constructor (data) {
    this.filePaths = data
    this.obj = {}
    this.filesToChange = {}
    this.pending = data
    return new Proxy(this, {
      that: this,
      get (target, name) {
        if (this.that.pending.length) {
          this.that.buildTypeObject()
        }
        if (name in target.obj) {
          return target.obj[name]
        } else if (name in target) {
          return target[name]
        } else {
          const err = new Error(`${name} File Not Imported`)
          err.name = 'NoImport'
          err.fileName = name
          throw err
        }
      }
    })
  }

  buildzip (data) {
    return new Promise((resolve, reject) => {
      const location = data.outputDirectory + data.name
      const output = fs.createWriteStream(location)

      output.on('close', (data) => {
        const bytes = archive.pointer()
        resolve({
          location: location,
          bytes: bytes
        })
      })

      archive.on('warning', (err) => {
        reject(err)
      })

      archive.on('error', (err) => {
        reject(err)
      })

      output.on('error', (err) => {
        reject(err)
      })

      archive.pipe(output)
      archive.directory(projectRoot + '/build/' + config.appName + '/appserver', 'appserver')
      archive.directory(projectRoot + '/build/' + config.appName + '/bin', 'bin')
      archive.directory(projectRoot + '/build/' + config.appName + '/default', 'default')
      archive.directory(projectRoot + '/build/' + config.appName + '/lookups', 'lookups')
      archive.directory(projectRoot + '/build/' + config.appName + '/metadata', 'metadata')

      archive.finalize()
    })
  }

  writeChanges () {
    Object.values(this.obj).forEach((value) => {
      if (value.type !== 'directory') {
        if (value.cached !== value.original.toString()) {
          this.filesToChange[value.name] = value
        }
      }
    })
    Object.values(this.filesToChange).forEach((value) => {
      fs.writeFileSync(value.path, value.cached.toString(), { encoding: 'utf8', flag: 'w' })
    })
  }

  writeOriginals () {
    Object.values(this.filesToChange).forEach((value) => {
      if (value.type !== 'directory') {
        fs.writeFileSync(value.path, value.original.toString(), { encoding: 'utf8', flag: 'w' })
      }
    })
  }

  buildTypeObject () {
    const unimported = []
    for (let i = 0; i < this.pending.length; i++) {
      let statobj = {}
      try {
        statobj = fs.lstatSync(this.pending[i])
      } catch (err) {
        if (/no such file or directory/.test(err.message.toString())) {
          unimported.push(this.pending[i])
          continue
        } else {
          console.log(err)
        }
      }
      let type = ''
      if (statobj.isFile()) {
        type = 'file'
      } else if (statobj.isDirectory()) {
        type = 'directory'
      }
      const ext = path.extname(this.pending[i])
      const name = path.basename(this.pending[i], ext)
      if (ext === '.conf') {
        this.obj[name] = new ConfWrapper({ path: this.pending[i], name: name, ext: ext, type: type })
      } else if (ext === '.js') {
        this.obj[name] = new JSWrapper({ path: this.pending[i], name: name, ext: ext, type: type })
      } else if (type === 'directory') {
        this.obj[name] = new DirWrapper({ path: this.pending[i], name: name, ext: ext, type: type })
      }
    }
    this.pending = unimported
  }
}

module.exports = ConfigManipulator
