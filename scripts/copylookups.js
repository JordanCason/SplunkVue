'use strict'

const fs = require('fs')
const config = require('./splunk.config.json')
const lookupsDir = '../data/lookups/'
const lookupsDest = '../build/' + config.appName + '/lookups/'
var splunkjs = require('splunk-sdk')

var service = new splunkjs.Service({ username: 'admin', password: 'changeme2' })

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

const copyLookups = () => {
  // @dev create ../build/faude/lookups/ if it does not exist
  try {
    fs.mkdirSync(`${__dirname}/${lookupsDest}`)
    console.log(`Creating ${__dirname}/${lookupsDest}`)
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(err)
    }
  }
  // @dev read from lookupsDir and copy files to lookupsDest
  fs.readdir(`${__dirname}/${lookupsDir}`, async (err, files) => {
    if (err) {
      console.error(err)
    }
    try {
      for (let i = 0; i < files.length; i++) {
        fs.copyFileSync(`${__dirname}/${lookupsDir + files[i]}`, `${__dirname}/${lookupsDest + files[i]}`, (err) => {
          if (err) {
            console.error(err)
          }
        })
        addDataToKVs(files[i])
      }
    } catch (err) {
      console.error('Run The Campaign Generator to add data to the data folder:\n\n' + err)
    }
  })
}

const addDataToKVs = (filename) => {
  service.login(function (err, success) {
    if (err) {
      throw err
    }
  })
  var searchQuery = `|inputlookup ${filename} | outputlookup ${filename.slice(0, -4)}`
  console.log(searchQuery)
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

copyLookups()
