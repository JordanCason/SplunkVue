'use strict'

const path = require('path')
const appConfig = require('../splunk.config.json')
const projectRoot = path.resolve(__dirname, '../')
const ConfigManipulator = require('./packageHelper')
const Utils = require('./utils')
const watcher = require('./watchers')
const Docker = require('./docker')
const docker = new Docker()
let prompt = null

const config = new ConfigManipulator([
  projectRoot + '/build/' + appConfig.appName + '/default/savedsearches.conf',
  projectRoot + '/build/' + appConfig.appName + '/default/app.conf',
  projectRoot + '/src/entry/example1.js',
  projectRoot + '/src/entry/example2/example2.js',
  projectRoot + '/src/entry/example3/example3.js',
  projectRoot + '/src/stores/example3/modules/targetSearchBarState.js',
  projectRoot + '/vue.config.js',
  projectRoot + '/build/' + appConfig.appName + '/default/indexes.conf',
  projectRoot + '/build/' + appConfig.appName + '/'
])

class PackageProject {
  async editProjectForProduction (args) {
    console.log('We Still need to update the app version and build numbers')
    const version = await prompt.askVersionNumber(config.app.launcher.version)
    if (version !== config.app.launcher.version) {
      config.app.launcher.version = version
      config.app.write()
    }
    await Utils.cleanDir({ location: '/build' })
    // @dev Any Sorce File manipulation should be added here
    // before we rebuild the project.
    config.example1.rexReplace(/'\/en-US\/splunkd\/__raw'/g, '\'/splunk/en-US/splunkd/__raw\'')
    config.example1.write()
    config.example2.rexReplace(/'\/en-US\/splunkd\/__raw'/g, '\'/splunk/en-US/splunkd/__raw\'')
    config.example2.write()
    config.example3.rexReplace(/'\/en-US\/splunkd\/__raw'/g, '\'/splunk/en-US/splunkd/__raw\'')
    config.example3.write()
    config.targetSearchBarState.rexReplace(/\/en-US\/app/g, '/splunk/en-US/app')
    config.targetSearchBarState.write()

    await Utils.buildProject({
      ...args,
      'source-map': ''
    })
    config.exampleApp.remove({ extensions: ['.pyc', '.DS_Store'] })
    config.indexes.remove()
    config.savedsearches.changeKeys({
      'Fire Eye Ingestion': {
        cron_schedule: '*/10 * * * *',
        'dispatch.earliest_time': '-60m'
      },
      'Virus Total Ingestion': {
        search: '|ingestvt limit=5'
      },
      'Faude Link Indexing': {
        cron_schedule: '0 * * * *',
        search: '|indexlinks maxage=1296000|collect index=exampleApp sourcetype=example1_url_analysis'
      },
      'Faude Target Indexing': {
        cron_schedule: '0 * * * *',
        search: '|indextargets maxage=1209600'
      }
    })
    config.app.virustotal.apikey = 'fakekey'
    config.savedsearches.write()
    config.app.write()
    const zipinfo = await config.buildzip({
      name: 'package_' + config.app.launcher.version + '.zip',
      outputDirectory: projectRoot + '/'
    })
    // @dev write back any to Non build directory files
    config.example1.writeOriginal()
    config.example2.writeOriginal()
    config.example3.writeOriginal()
    config.targetSearchBarState.writeOriginal()
    return zipinfo
  }

  async start (args) {
    if (!args) {
      args = {}
    }
    const defaultArgs = {
      stdio: 'ignore'
    }
    args = {
      ...defaultArgs,
      ...args
    }
    prompt = require('./commands')
    prompt.start()
    try {
      await watcher.close()
      const zipinfo = await this.editProjectForProduction(args)
      console.log('INFO: Rebuilding Dev Build')
      await Utils.cleanDir({ location: '/build' })
      await Utils.buildProject(args)
      console.log('INFO: Splunk Container Is Restarting')
      await docker.restartContainer()
      console.log('Package Created:')
      console.table(zipinfo)
    } catch (err) {
      if (err.name === 'NoImport') {
        // @dev if we try and access an import that does not exist
        // likly because there was not a privious build
        const answer = await prompt.askToBuildProject({ fileName: err.fileName })
        if (answer === 'yes') {
          await Utils.cleanDir({ location: '/build' })
          await Utils.buildProject(args)
          console.log('INFO: Splunk Container Is Restarting')
          await docker.restartContainer()
          console.log('INFO: Restart Packaging')
          this.start()
        }
      } else {
        throw err
      }
    }
  }
}

module.exports = new PackageProject()
