const prompt = require('./commands')
const Docker = require('./docker')
const docker = new Docker()
const Puppeteer = require('./puppeteer')
const chrome = new Puppeteer()
const watcher = require('./watchers')
const Utils = require('./utils')
const minimist = require('minimist')
const args = minimist(process.argv)

process.on('SIGINT', () => {
  Utils.shutdown()
})
process.on('exit', () => {
  Utils.shutdown()
})

async function readArgs () {
  const parsed = {}
  if (args._.length > 2) {
    parsed.command = args._[args._.length - 1]
    parsed.args = args
    delete parsed.args._
    Utils.store = {
      ...Utils.store,
      args: parsed.args
    }
    prompt.RLSwitch(parsed)
  }
  start()
}

async function start () {
  this.state = {
    containerExists: false,
    containerRunning: false,
    splunkReady: false,
    watcherReady: false,
    puppeteerReady: false,
    transpiling: false
  }
  if (!Utils.checkBuildExistence()) {
    console.log('INFO: Initial Build Transpiling')
    await Utils.buildProject()
    const running = await Docker.isContainerRunning()
    if (running) {
      this.containerRunning = false
      await docker.shutdownContainer()
    }
  }
  docker.startupSplunk()
  watcher.start()
  prompt.start()

  docker.on('exists', () => {
    console.log('INFO: SplunkCustom Container Exists')
    this.state.containerExists = true
  })
  docker.on('running', () => {
    console.log('INFO: Splunk Container Is Running')
    this.state.containerRunning = true
  })
  docker.on('ready', async () => {
    this.state.splunkReady = true
    if (this.state.puppeteerReady) {
      chrome.loadSplunkWeb()
    }
    const result = await Utils.isDataEmpty()
    if (result) {
      Utils.copyLookups()
    }
    console.log('INFO: Splunk Service Is Ready')
    prompt.prompt()
    Utils.buildWatcher()
  })
  watcher.on('watcherReady', () => {
    this.state.watcherReady = true
  })
  watcher.on('webpackBuild', async () => {
    if (!this.state.transpiling) {
      console.log('INFO: Transpiling Source For New Build')
      this.state.transpiling = true
      Puppeteer.sendMessage({
        type: 'SET_BANNER',
        payload: {
          background: '#2196F3',
          color: 'white',
          text: 'Transpiling... please wait'
        }
      })
      Utils.buildProject()
      this.state.transpiling = false
    }
  })
  watcher.on('uiReload', async () => {
    if (this.state.splunkReady) {
      console.log('INFO: Splunk Web UI Is Reloading')
      await docker.reloadViews()
      chrome.page.reload()
    }
  })
  watcher.on('serviceReload', () => {
    if (this.state.splunkReady) {
      console.log('INFO: Splunk Service Is Restarting')
      docker.restartSplunk()
    }
  })
  watcher.on('containerReload', (filename) => {
    if (this.state.splunkReady) {
      console.log('INFO: Splunk Container Is Restarting')
      docker.restartContainer()
    }
  })
  await chrome.setupWebSocket()
  await chrome.launchPuppeteer()
  this.state.puppeteerReady = true
  chrome.injectLoadingPage()
  chrome.loadWebSocketInjector()
  if (this.state.splunkReady) {
    chrome.loadSplunkWeb()
  }
}

setTimeout(() => {
  readArgs()
}, 1000)
