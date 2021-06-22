const Docker = require('./docker')
const docker = new Docker()
const config = require('../splunk.config.json')
const spawn = require('child_process').spawn
const readline = require('readline')
const watcher = require('./watchers')
const packageProject = require('./package3')
const Utils = require('./utils')
const Puppeteer = require('./puppeteer')
const chrome = new Puppeteer()

let instance = null
let running = false

class Prompt {
  constructor () {
    if (!instance) {
      instance = new Proxy(this, {
        that: this,
        get (target, key) {
          if (running && key === 'start') {
            return () => true
          }
          if (key === 'rl' && !running) {
            return new Proxy(target, {
              // @dev if rl ans never been instantiated wrap the empty rl object in a proxy
              // to allow function calls that just return an empty function
              get (target, key) {
                return () => undefined
              }
            })
          } else {
            return target[key]
          }
        }
      })
    }
    return instance
  }

  start () {
    running = true
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'SplunkDEV$ '
    })
    this.rl.on('line', (line) => {
      const parsed = {
        command: '',
        args: {}
      }
      const command = [...line.matchAll(/(?<command>^.+?)(\s*?--|$)/)]
      if (command.length) {
        parsed.command = command[0].groups.command
      }
      const matches = [...line.matchAll(/--(?<key>.+?)\s*?=\s*?("|')?(?<value>.+?)("|'|\s|$)/g)]
      matches.forEach((data) => {
        parsed.args[data.groups.key] = data.groups.value
      })
      this.RLSwitch(parsed)
    })
    return true
  }

  prompt () {
    // @dev small delay for aesthetics
    setTimeout(() => {
      this.rl.prompt()
    }, 5)
  }

  async RLSwitch (data) {
    const args = data.args
    const command = data.command.trim()
    this.rl.pause()
    try {
      if (/help/i.test(command)) {
        this.showHelp()
      } else if (/^shell/i.test(command)) {
        await this.dockerShell()
      } else if (/^((clean\s?build)|(build\s?clean))/i.test(command)) {
        const restartWatcher = watcher.close()
        await Utils.cleanDir({ location: '/build' })
        if (restartWatcher) {
          watcher.start()
        }
      } else if (/^((clean\s?data)|(data\s?clean))/i.test(command)) {
        await Utils.cleanDir({ location: config.dstCsvDir })
      } else if (/^build/i.test(command)) {
        Puppeteer.sendMessage({
          type: 'SET_BANNER',
          payload: {
            background: '#2196F3',
            color: 'white',
            text: 'Starting fresh new build... Please wait.'
          }
        })
        const restartWatcher = watcher.close()
        const didBuild = await Utils.buildProject(args)
        if (didBuild && restartWatcher) {
          await docker.restartContainer()
          await watcher.start()
        }
      } else if (/^((restart\s?container)|(container\s?restart))/i.test(command)) {
        console.log('INFO: Splunk Container Is Restarting')
        await docker.restartContainer()
      } else if (/^((restart\s?splunk)|(splunk\s?restart))/i.test(command)) {
        console.log('INFO: Splunk Service Is Restarting')
        await docker.restartSplunk()
      } else if (/^((restart\s?chrome)|(chrome\s?restart))/i.test(command)) {
        console.log('INFO: Chrome Is Restarting')
        await chrome.launchPuppeteer()
        await chrome.loadSplunkWeb()
        chrome.loadWebSocketInjector()
      } else if (/^package/i.test(command)) {
        console.log('INFO: Packaging Splunk App')
        await packageProject.start(args)
      } else if (/^(((stop|shutdown|quit)\s?watcher)|(watcher\s?(stop|shutdown|quit)))/i.test(command)) {
        console.log('INFO: Stoping Watcher')
        await watcher.watcher.close()
      } else if (/^(exit|quit|shutdown)/i.test(command)) {
        this.close()
      } else if (/^(workon)/i.test(command)) {
        console.log('INFO: working on ' + args.dashboard + ' dashboard')
      } else if (/^(list\s?dashboards?)/i.test(command)) {
        this.listDashboards()
      } else {
        await this.passThrough(command)
      }
    } catch (err) {
      console.log(err)
    }
    Utils.store = {
      ...Utils.store,
      args: {
        ...Utils.store.args,
        ...args
      }
    }
    this.rl.prompt()
  }

  showHelp () {
    let page = ''
    const strings = [
      '\nCurrently working on ' + Utils.store.args.dashboard + ' dashboard\n\n',
      'Commands\t\t\t\tDescription\n\n',
      'shell\t\t\t\t\tEnter Splunk Docker Container at /bin/bash\n',
      'clean (build|data)\t\t\tRemove all data from the splunk build directory\n',
      'workon\t\t\t\t\tSpecify a dashboard to build when working defaults to all\n',
      '\t\t\t\t\tflags:\n',
      '\t\t\t\t\t--dashboard="<dashboard name>"\n',
      'build\t\t\t\t\tBuild the application zip file\n',
      '\t\t\t\t\tflags:\n',
      '\t\t\t\t\t--dashboard="<dashboard name>"\n',
      '\t\t\t\t\t--source-map="<Webpack Build Type>"\n',
      '\t\t\t\t\t--stdio="<inherit|ignore>"\n\n',
      'restart (container|splunk|chrome)\tRestart the Docker Container\n',
      'list dashboards\t\t\t\tList Dashboards\n',
      'package\t\t\t\t\tZip Splunk App\n',
      '\t\t\t\t\tflags:\n',
      '\t\t\t\t\t--dashboard="<dashboard name>"\n',
      '\t\t\t\t\t--source-map="<Webpack Build Type>"\n',
      '\t\t\t\t\t--stdio="<inherit|ignore>"\n\n',
      'stop watcher\t\t\t\tShutdown the file watcher\n',
      'exit\t\t\t\t\tShutdown all services and exit the application\n'
    ]
    strings.forEach((value) => {
      page += value
    })
    console.log(page)
  }

  passThrough (data) {
    return new Promise((resolve, reject) => {
      if (data.length === 0) {
        resolve()
      } else {
        const proc = spawn(data, {
          stdio: 'inherit',
          shell: true
        })
        proc.on('close', (data) => {
          resolve()
        })
        proc.on('error', (err) => {
          reject(err)
        })
      }
    })
  }

  listDashboards () {
    Object.values(config.dashboards).forEach((data) => {
      data = {
        name: data.entry ? data.entry.name : data.xmlEntry.name,
        path: data.entry ? data.entry.path : data.xmlEntry.path,
        type: data.type
      }
      console.log(`Dashboard: \x1b[36m${data.name.trim()}\x1b[0m, Type: \x1b[36m${data.type.trim()}\x1b[0m`)
    })
  }

  dockerShell () {
    return new Promise((resolve, reject) => {
      const proc = spawn('docker exec -it splunkcustom /bin/bash', {
        stdio: 'inherit',
        shell: true
      })
      proc.on('close', (data) => {
        resolve()
      })
      proc.on('error', (err) => {
        reject(err)
      })
    })
  }

  askVersionNumber (version) {
    return new Promise((resolve, reject) => {
      this.rl.question(`Version Number (${version}):`, (answer) => {
        if (!answer) {
          answer = version
        }
        resolve(answer)
      })
    })
  }

  askToBuildProject (data) {
    return new Promise((resolve, reject) => {
      this.rl.question(`${data.fileName} does not currently exist.\n` +
        'If this file normaly exists in the build directory, rebuild and try again.\n' +
        '\n\nWould you Like to build and try again now? (yes): ', (answer) => {
        if (!answer) {
          answer = 'yes'
        }
        resolve(answer)
      })
    })
  }

  close () {
    Utils.shutdown()
  }
}

module.exports = new Prompt()
