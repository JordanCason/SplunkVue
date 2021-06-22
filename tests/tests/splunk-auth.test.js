const http = require('http')

const agent = new http.Agent({
  keepAlive: true
})

const options = {
  hostname: process.env.npm_config_splunkHost,
  port: process.env.npm_config_splunkPort,
  path: '/en-US/account/insecurelogin?loginType=splunk' +
              '&username=' + process.env.npm_config_splunkUsername +
              '&password=' + process.env.npm_config_splunkPassword,
  method: 'GET',
  agent: agent,
  headers: {
    //        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
    //        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    //        'Accept': 'text/javascript, text/html, application/xml, text/xml, */*',
    //        'Sec-Fetch-Mode': 'cors',
    //        'Sec-Fetch-Site': 'same-origin',
    //        'Accept-Language': 'en-US,en;q=0.9',
  }
}

function request () {
  return new Promise(resolve => {
    http.get(options, response => {
      let data = ''
      response.on('data', _data => (data += _data))
      response.on('end', () => resolve({
        headers: response.headers,
        body: data,
        status: response.statusCode
      }))
    })
  })
};

it('Should have cookies.', async () => {
  expect.assertions(1)
  const response = await request()
  expect(response.headers).toHaveProperty('set-cookie')
})

it('Should have a 303 status.', async () => {
  expect.assertions(1)
  const response = await request()
  expect(response.status).toBe(303)
})
