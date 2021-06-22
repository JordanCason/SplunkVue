'use strict'

const EventEmitter = require('events')
const Puppeteer = require('./puppeteer')
const Utils = require('./utils')
const { Docker } = require('node-docker-api')
const tar = require('tar-fs')
const config = require('../splunk.config.json')
const path = require('path')
const dockerfile = config.docker.dockerfile
const dockerpath = config.docker.dockerpath
const imageName = config.docker.imageName
const projectRoot = path.resolve(__dirname, '../')
const https = require('https')
let instance = null
let running = false
let splunkcustom = null
const restartOptions = {
  host: '0.0.0.0',
  port: 8089,
  method: 'POST',
  path: 'https://0.0.0.0:8089/services/server/control/restart',
  headers: {
    Authorization: 'Basic ' + Buffer.from('admin:changeme2').toString('base64')
  }
}
const reloadOptions = {
  host: '0.0.0.0',
  port: 8089,
  path: '/servicesNS/-/-/data/ui/views/_reload',
  headers: {
    Authorization: 'Basic ' + Buffer.from('admin:changeme2').toString('base64')
  }
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

const aDockerInstance = new Docker({ socketPath: '/var/run/docker.sock' })
class SplunkDocker extends Utils.multiExtends(Docker, EventEmitter) {
  constructor () {
    super({ socketPath: '/var/run/docker.sock' })
    if (!instance) {
      this.splunkcustom = splunkcustom
      instance = new Proxy(this, {
        get (target, key) {
          if (running || key === 'startupSplunk' || key === 'shutdownContainer') {
            return target[key]
          } else {
            return () => undefined
          }
        }
      })
    }
    return instance
  }

  static doesContainerExist () {
    // @dev checks if the splunkcustom container exists and if so
    // we set the container to this.splunkcustom
    // @resolve bool
    return new Promise((resolve, reject) => {
      if (splunkcustom) {
        resolve(true)
      } else {
        aDockerInstance.container.list({ all: true }).then((containers) => {
          if (containers.length !== 0) {
            for (const i in containers) {
              if (containers[i].data.Image === imageName) {
                splunkcustom = containers[i]
                resolve(true)
              } else {
                resolve(false)
              }
            }
          } else {
            resolve(false)
          }
        })
      }
    })
  }

  static async isContainerRunning () {
    // @dev is the container currently running
    // @return bool
    if (!splunkcustom) {
      await SplunkDocker.doesContainerExist()
    }
    if (splunkcustom) {
      const data = await splunkcustom.status()
      return data.data.State.Status === 'running'
    } else {
      return false
    }
  }

  startContainer (isFirstRun) {
    // @pram {isFirstRun} first run after a build the splunk service reloads
    // @dev Starts the container and resolves with Splunk Service is ready
    return new Promise((resolve, reject) => {
      let command
      if (isFirstRun) {
        command = 'sudo mkdir var/log && ' +
          'sudo mkdir var/log/splunk && ' +
          'sudo touch var/log/splunk/web_service.log && ' +
          'sudo tail -n0 -f var/log/splunk/web_service.log'
      } else {
        command = 'sudo tail -n0 -f var/log/splunk/web_service.log'
      }
      splunkcustom.start().then((container) => {
        container.exec.create({
          AttachStdout: true,
          AttachStderr: true,
          Cmd: ['/bin/bash', '-c', command]
        }).then(exec => {
          return exec.start({ Detach: false })
        }).then((stream) => {
          // console.log('stream ', stream)
          stream.on('data', (data) => {
            // console.log(data.toString())
            if (data.toString().includes('Serving on 127.0.0.1')) {
              if (!isFirstRun) {
                stream.destroy()
                setTimeout(() => {
                  resolve()
                }, 100)
              } else {
                isFirstRun = false
              }
            }
          })
        })
      })
    })
  }

  buildImage () {
    // @dev builds the new splunk image
    return new Promise((resolve, reject) => {
      this.image.build(tar.pack(projectRoot + dockerpath), {
        t: imageName,
        dockerfile: dockerfile
      })
        .then(stream => {
          // @dev for some reason could only reach resolve if
          // on data was spessified with some function
          stream.on('data', () => {})
          stream.on('error', err => console.log(err))
          stream.on('end', () => {
            resolve()
          })
        })
        .catch(err => console.log(err))
    })
  }

  createContainer () {
    return new Promise((resolve, reject) => {
      this.container.create({
        Image: 'splunkcustom',
        name: 'splunkcustom',
        ExposedPorts: {
          '8000/tcp': {},
          '8089/tcp': {}
        },
        HostConfig: {
          PortBindings: {
            '8000/tcp': [{ HostPort: '8000' }],
            '8089/tcp': [{ HostPort: '8089' }]
          },
          Binds: [
            path.join(__dirname, '/../build/' + config.appName + ':/opt/splunk/etc/apps/' + config.appName),
            path.join(__dirname, '/../data:/data')
          ]
        }
      }).then((container) => {
        splunkcustom = container
        resolve(container)
      })
    })
  }

  async restartContainer () {
    Puppeteer.sendMessage({
      type: 'SET_BANNER',
      payload: {
        background: '#E9724C',
        color: 'white',
        text: 'Restarting Splunk... Please Wait'
      }
    })
    this.emit('restartContainer')
    await this.shutdownContainer()
    await this.startContainer()
    this.emit('ready', true)
    return this
  }

  reloadViews (page) {
    return new Promise((resolve, reject) => {
      https.get(reloadOptions, res => {
        res.on('data', () => {
          resolve()
          res.destroy()
        })
        res.on('error', e => {
          reject(e)
        })
      })
    })
  }

  shutdownContainer () {
    return new Promise((resolve, reject) => {
      splunkcustom.stop().then((data, err) => {
        if (err) {
          reject(new Error('Error in container shutdown: ', err))
        }
        const checkStatus = async () => {
          const data = await splunkcustom.status()
          if (data.data.State.Status === 'exited') {
            resolve('Left Docker status check.')
            return
          }
          setTimeout(async () => {
            await checkStatus()
          }, 1)
        }
        checkStatus()
      })
    })
  }

  restartSplunk () {
    return new Promise((resolve, reject) => {
      Puppeteer.sendMessage({
        type: 'SET_BANNER',
        payload: {
          background: '#E9724C',
          color: 'white',
          text: 'Restarting Splunk... Please Wait'
        }
      })
      this.emit('restartSplunk')
      https.get(restartOptions, res => {
        // @dev for some reason could only reach resolve if
        // on data was spessified with some function
        res.on('data', () => {})
        res.on('end', () => {
          this.splunkcustom.exec.create({
            AttachStdout: true,
            AttachStderr: true,
            Cmd: ['/bin/bash', '-c', 'sudo tail -n0 -f var/log/splunk/web_service.log']
          }).then(exec => {
            return exec.start({ Detach: false })
          }).then((stream) => {
            // console.log('stream ', stream)
            stream.on('data', (data) => {
              // console.log(data.toString())
              if (data.toString().includes('Serving on 127.0.0.1')) {
                stream.destroy()
                setTimeout(() => {
                  this.emit('ready', true)
                  resolve()
                }, 100)
              }
            })
          })
        })
      }).on('error', e => {
        console.error(e)
      })
    })
  }

  async startupSplunk () {
    running = true
    const doesContainerExist = await SplunkDocker.doesContainerExist()
    if (doesContainerExist) {
      this.emit('exists', doesContainerExist)
      const isContainerRunning = await SplunkDocker.isContainerRunning()
      if (isContainerRunning) {
        this.emit('running', isContainerRunning)
        this.emit('ready', true)
      } else {
        console.log('INFO: Starting Splunk Container')
        await this.startContainer()
        this.emit('ready', true)
      }
    } else {
      console.log('INFO: Building Splunk Image')
      await this.buildImage()
      console.log('INFO: Creating Splunk Container')
      await this.createContainer()
      console.log('INFO: Starting Splunk Container')
      await this.startContainer(true)
      this.emit('ready', true)
    }
  }
}

module.exports = SplunkDocker
