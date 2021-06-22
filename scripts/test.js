'use strict'

const { Docker } = require('node-docker-api')
const docker = new Docker({ socketPath: '/var/run/docker.sock' })
const os = require('os')
const path = require('path')

const ifaces = os.networkInterfaces()
var address = null

for (const ifname in ifaces) {
  for (const item in ifaces[ifname]) {
    if (ifaces[ifname][item].family === 'IPv4' &&
           ifaces[ifname][item].internal === false) {
      address = ifaces[ifname][item].address
      console.log(ifaces[ifname][item])
      break
    }
  }
}
console.log('Connecting to ' + address + '...')

function start () {
  docker.container.create({
    Image: 'splunktest',
    name: 'splunktest',
    Tty: true,
    HostConfig: {
      Binds: [
        path.join(__dirname, '/../tests:/tests')
      ]
    },
    Cmd: [
      'npm',
      'run',
      'test',
      '--silent',
      '--splunkHost=' + address,
      '--splunkPort=8000',
      '--splunkUsername=admin',
      '--splunkPassword=changeme2'
    ]
  })
    .then(container => container.start())
    .then(container => container.logs({
      follow: true,
      stdout: true,
      stderr: true
    }))
    .then(stream => {
      stream.on('data', info => console.log(info.toString()))
      stream.on('error', err => console.log(err.toString()))
    })
    .catch(error => console.log(error))
}

docker.container.list({ all: true }).then(containers => {
  containers.forEach(function (container, index) {
    if (container.data.Image === 'splunktest') {
      container.delete({ force: true })
    }
  })
  setTimeout(function () { start() }, 3000)
})
