const spawn = require('child_process').spawn
const path = require('path')
const fs = require('fs')
const projectRoot = path.resolve(__dirname, '../')
const config = require('../splunk.config.json')
const Puppeteer = require('./puppeteer')
const chrome = new Puppeteer()
const watcher = require('./watchers')
const splunkjs = require('splunk-sdk')
const service = new splunkjs.Service({ username: 'admin', password: 'changeme2' })
const store = {
  args: {
    dashboard: 'all',
    'source-map': 'cheap-eval-source-map',
    stdio: 'inherit'
  }
}
let shuttingDown
let childProcess = null
let instance = null
let buildQueue = []

class Utils {
  constructor () {
    if (!instance) {
      instance = this
    }
    return instance
  }

  static buildWatcher () {
    // setInterval(() => {
    //   console.log(buildQueue.length)
    //   console.log('injecting')
    //   Puppeteer.sendMessage({
    //     type: 'SET_BANNER',
    //     payload: {
    //       background: '#C5283D',
    //       color: 'white',
    //       text: 'Build Queue ' + buildQueue.length + ' Please Wait...'
    //     }
    //   })
    // }, 1000)
  }

  static store = store

  static multiExtends (baseClass, ...mixins) {
    class base extends baseClass {
      constructor (...args) {
        super(...args)
        mixins.forEach((Mixin) => {
          // eslint-disable-next-line
          copyProps(this, (new Mixin))
        })
        this.shuttingDown = false
      }
    }
    const copyProps = (target, source) => {
      Object.getOwnPropertyNames(source)
        .concat(Object.getOwnPropertySymbols(source))
        .forEach((prop) => {
        // @dev See https://github.com/nodejs/node/issues/31787 for 12.16 changes
          if (!String(prop).match(/^(?:constructor|prototype|arguments|caller|name|bind|call|apply|toString|length)$/)) {
            Object.defineProperty(target, prop, Object.getOwnPropertyDescriptor(source, prop))
          }
        })
    }
    mixins.forEach((mixin) => {
      copyProps(base.prototype, mixin.prototype)
      copyProps(base, mixin)
    })
    return base
  }

  static checkBuildExistence () {
    const dirs = config.watcher.directorys.uiReload
    for (let i = 0; i < dirs.length; i++) {
      if (!fs.existsSync(projectRoot + dirs[i])) {
        return false
      }
    }
    return true
  }

  static buildProject (args, buildFromQueue) {
    return new Promise((resolve, reject) => {
      if (!args) {
        args = {}
      }
      args = {
        ...this.store.args,
        ...args
      }
      if (!buildFromQueue) {
        buildQueue.push(args)
      }
      if (buildQueue.length > 1) {
        console.log('Your build queue is greater than one: ', buildQueue.length)
        resolve(false)
        return // cache build arguments to exicute later
      }
      // watcher.once('uiReload', async () => {
      //   // @dev if page load is to fast and not picking up the most recent
      //   // saved changes move the body of this function
      //   // into the on exit of childProcess and remove the watcher.once
      //   console.log('In watcher, about to slice buildQueue: ', buildQueue)
      //   buildQueue = buildQueue.slice(1)
      //   const newQuedBuild = buildQueue.slice(0, 1)[0]
      //   if (newQuedBuild) {
      //     Utils.buildProject(newQuedBuild, true)
      //   }
      //   setTimeout(() => {
      //     console.log('INFO: Build Finished')
      //     resolve(true)
      //   }, 100)
      // })
      const command = `vue-cli-service build --no-clean --colors \
        --dashboard="${args.dashboard}"\
        --source-map="${args['source-map']}"`
      if (args.dashboard === 'all' || args.dashboard in config.dashboards) {
        childProcess = spawn(command, {
          stdio: args.stdio,
          shell: true
        })
        childProcess.on('exit', (data) => {
          console.log('In exit with: ', data)
          if (data) {
            Puppeteer.sendMessage({
              type: 'SET_BANNER',
              payload: {
                background: '#C5283D',
                color: 'white',
                text: 'Error: Check node console output!'
              }
            })
          }
          buildQueue = buildQueue.slice(1)
          const newQuedBuild = buildQueue.slice(0, 1)[0]
          if (newQuedBuild) {
            Utils.buildProject(newQuedBuild, true)
          }
          resolve(true)
        })
        childProcess.on('error', (data) => {
          console.log('We are in error with: ', data)
          reject(data)
        })
      } else {
        console.log('This is not the dashboard your looking for')
        resolve(false)
      }
    })
  }

  static cleanDir (data) {
    return new Promise((resolve, reject) => {
      const shouldRestartWatcher = watcher.close()
      const buildDir = projectRoot + data.location
      let folderList = []
      try {
        folderList = fs.readdirSync(buildDir)
      } catch (err) {
        console.log(err)
      }
      for (let i = 0; i < folderList.length; i++) {
        console.log(`INFO: Removing ${folderList[i]}`)
        try {
          fs.rmdirSync(buildDir + `/${folderList[i]}`, { recursive: true })
        } catch (err) {
          console.log(err)
        }
      }
      if (shouldRestartWatcher) {
        watcher.start().then(() => {
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  static isDataEmpty () {
    return new Promise((resolve, reject) => {
      try {
        if (!fs.readdirSync(projectRoot + config.dstCsvDir).length) {
          resolve(true)
        } else {
          resolve(false)
        }
      } catch (err) {
        resolve(true)
      }
    })
  }

  static copyLookups () {
    // @dev create ../build/faude/lookups/ if it does not exist
    try {
      fs.mkdirSync(projectRoot + config.dstCsvDir)
      console.log(projectRoot + config.dstCsvDir)
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error(err)
      }
    }
    // @dev read from lookupsDir and copy files to lookupsDest
    fs.readdir(projectRoot + config.srcCsvDir, async (err, files) => {
      if (err) {
        console.error(err)
      }
      try {
        if (files.length) {
          console.log('INFO: Adding CSVs to KVStores\n\n')
        }
        for (let i = 0; i < files.length; i++) {
          await fs.copyFileSync(projectRoot + config.srcCsvDir + files[i], projectRoot + config.dstCsvDir + files[i], (err) => {
            if (err) {
              console.error(err)
            }
          })
          Utils.addDataToKVs(files[i])
        }
      } catch (err) {
        console.error('Run The Campaign Generater to add data to the data folder:\n\n' + err)
      }
    })
  }

  static addDataToKVs (filename) {
    service.login(function (err, success) {
      if (err) {
        throw err
      }
    })
    var searchQuery = `|inputlookup ${filename} | outputlookup ${filename.slice(0, -4)}`
    var searchParams = {
      exec_mode: 'blocking'
    }
    service.search(
      searchQuery,
      searchParams,
      function (err, job) {
        if (err) {
          console.error(err)
        }
      }
    )
  }

  static shutdown () {
    if (shuttingDown) {
      return
    }
    shuttingDown = true
    console.log('Goodbye!')
    try {
      watcher.close()
    } catch (err) {
      console.log(err)
    }
    try {
      chrome.close()
    } catch (err) {
      console.log(err)
    }
    process.exit()
  }
}

module.exports = Utils
