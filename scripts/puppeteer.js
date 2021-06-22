const path = require('path')
const config = require('../splunk.config.json')
const projectRoot = path.resolve(__dirname, '../')
const puppeteer = require('puppeteer')
const EventEmitter = require('events')
const WebSocket = require('ws')
const fs = require('fs')
const browserJS = fs.readFileSync(projectRoot + '/scripts/browser.html').toString()
let instance = null
let webSocket = {}
let isOpen = false
let running = false

class Chromium extends EventEmitter {
  constructor () {
    super()
    if (!instance) {
      instance = new Proxy(this, {
        get (target, key) {
          if (running || key === 'setupWebSocket') {
            return target[key]
          } else {
            return () => undefined
          }
        }
      })
    }
    this.page = {}
    this.browser = {}
    return instance
  }

  setupWebSocket () {
    running = true
    const wss = new WebSocket.Server({ port: 8085 })
    wss.on('connection', ws => {
      webSocket = ws
      isOpen = true
      webSocket.on('message', message => {
      //  this.emit('message', message)
      })
      webSocket.on('close', message => {
        this.isOpen = false
      })
    })
  }

  static sendMessage (message) {
    try {
      if (isOpen) {
        webSocket.send(JSON.stringify(message))
      }
    } catch (err) {
      // console.log(err)
    }
  }

  loadWebSocketInjector () {
    const elements = {
      template: [...browserJS.matchAll(/<template>\n?(?<template>[^]+)<\/template>?/gm)][0].groups.template.replace(/\n/, ''),
      style: [...browserJS.matchAll(/<style>\n?(?<style>[^]+)<\/style>?/gm)][0].groups.style,
      script: [...browserJS.matchAll(/<script>\n?(?<script>[^]+)<\/script>?/gm)][0].groups.script
    }
    const inject = () => {
      this.page.evaluate((elements) => {
        const template = document.createElement('div') // .hidden = true
        const style = document.createElement('style')
        const script = document.createElement('script')
        template.setAttribute(
          'style',
          'display:none'
        )
        template.innerHTML = elements.template
        style.innerHTML = elements.style
        script.innerHTML = elements.script
        document.querySelector('html').appendChild(template)
        document.querySelector('html').appendChild(style)
        document.querySelector('html').appendChild(script)
      }, elements).catch((err) => {
        if (err.message !== 'Execution context was destroyed, most likely because of a navigation.') {
          throw err
        }
      })
    }
    inject()
    this.page.on('load', () => {
      inject()
    })
  }

  injectLoadingPage () {
    this.page.evaluate(() => {
      const inject = document.createElement('div')
      inject.setAttribute(
        'style',
        'display:flex; flex-direction: row; justify-content: center; height: 60%; align-items: center'
      )
      inject.innerHTML = `<div style="display:flex; flex-direction: column; height: 70%">
      <img src="https://thumbs.gfycat.com/IlliterateConfusedAmericancrayfish-small.gif" height="285" width="256"/>
      <img src="http://coverall.splunk.com/web_assets/developers/devguide/DEV.png" height="258" width="256"/>
      </div>`
      document.querySelector('body').appendChild(inject)
    }).catch((err) => {
      if (err.message !== 'Execution context was destroyed, most likely because of a navigation.') {
        throw err
      }
    })
  }

  async loadSplunkWeb () {
    await this.page.goto('http://0.0.0.0:8000/en-US/app/' + config.appName + '/dashboards')
    await this.page.type('#password', 'changeme2')
    await this.page.type('#username', 'admin')
    await this.page.click('.splButton-primary.btn.btn-primary')
  }

  async launchPuppeteer () {
    this.browser = await puppeteer.launch({
      args: [
        '--disable-infobars',
        '--disable-web-security',
        '--no-sandbox',
        `--disable-extensions-except=${__dirname}/../node_modules/vue-devtools/vender`,
        `--load-extension=${__dirname}/devtools`
      ],
      headless: false,
      defaultViewport: null
    })
    const pages = await this.browser.pages()
    this.page = pages[0]
    await this.page.setCacheEnabled(false)
  }

  close () {
    this.browser.close()
    running = false
  }
}

module.exports = Chromium
