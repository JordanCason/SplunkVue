const http = require('http')
const port = process.env.npm_config_splunkPort
const host = process.env.npm_config_splunkHost

function request () {
  return new Promise(resolve => {
    http.get({
      host: host,
      port: port,
      path: '/en-US/account/login'
    }, response => {
      let data = ''
      response.on('data', _data => (data += _data))
      response.on('end', () => resolve(data))
    })
  })
};

it('Should have a login endpoint', async () => {
  await request()
})
