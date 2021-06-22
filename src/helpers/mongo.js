const config = require('../../splunk.config.json')
// @dev keeps track of when kvstors where updated
const mutationState = {}

const kvstore = {
  search (collection, search, callback) {
    // @pram {collection} string with name of collection to search
    // @pram {search} object with a stringifyed json object to search mongodb
    service.http.get(
      `/servicesNS/nobody/${config.appName}/storage/collections/data/${collection}`,
      { 'Content-Type': 'application/json' },
      search,
      null,
      (err, res) => {
        if (err) {
          callback(err, res)
        }
        callback(err, res)
      }
    )
  },
  read (collection, key, callback) {
    // @pram {collection} string with name of collection to search
    // @pram {key} the _key to the record to read from mongodb
    let endPoint = ''
    if (typeof (key) === 'function') {
      callback = key
    }
    if (key && typeof (key) !== 'function') {
      endPoint = `/servicesNS/nobody/${config.appName}/storage/collections/data/${collection}/${key}`
    } else {
      endPoint = `/servicesNS/nobody/${config.appName}/storage/collections/data/${collection}`
    }
    service.http.get(
      endPoint,
      { 'Content-Type': 'application/json' },
      null,
      null,
      (err, res) => {
        if (err) {
          callback(err, res)
        }
        callback(err, res)
      }
    )
  },
  update (collection, key, record, callback, update = true) {
    // @pram {collection} string with name of collection to search
    // @pram {key} the _key to the record to update from mongodb
    // @pram {record} Object to update to at the location of _key
    if (typeof collection === 'object') {
      return this.update2(collection)
    }
    service.http.request(
      `/servicesNS/nobody/${config.appName}/storage/collections/data/${collection}/${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: null,
        body: JSON.stringify(record)
      },
      (err, res) => {
        if (err) {
          callback(err, res)
        }
        callback(err, res)
      }
    )
  },
  update2 (args) {
    return new Promise((resolve, reject) => {
      // @pram {collection} string with name of collection to search
      // @pram {key} the _key to the record to update from mongodb
      // @pram {record} Object to update to at the location of _key
      service.http.request(
        `/servicesNS/nobody/${config.appName}/storage/collections/data/${args.collection}/${args.key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          timeout: null,
          body: JSON.stringify(args.record)
        },
        (err, res) => {
          if (err) {
            reject(err)
          }
          resolve(err, res)
        }
      )
    })
  },
  insert (collection, record, callback, update = true) {
    // @pram {collection} string with name of collection to search
    // @pram {record} Object to update to at the location of _key
    service.http.request(
      `/servicesNS/nobody/${config.appName}/storage/collections/data/${collection}/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: null,
        body: JSON.stringify(record)
      },
      (err, res) => {
        if (err) {
          callback(err, res)
        }
        callback(err, res)
      }
    )
  },
  userInfo (callback) {
    // @dev get the loged in user info
    service.http.get(
      '/services/authentication/current-context',
      {},
      null,
      null,
      (err, res) => {
        if (err) {
          callback(err, res)
        }
        res.username = res.data.entry[0].content.username
        res.realname = res.data.entry[0].content.realname
        callback(err, res)
      }
    )
  },
  delete (collection, key, callback, update = true) {
    // @pram {collection} string with name of collection to delete from
    // @pram {key} the _key to the record to delete from mongodb
    service.http.del(
      `/servicesNS/nobody/${config.appName}/storage/collections/data/${collection}/${key}`,
      { 'Content-Type': 'application/json' },
      null,
      null,
      (err, res) => {
        if (err) {
          callback(err, res)
        }
        callback(err, res)
      }
    )
  },
  info (collection, callback) {
    // @pram {collection} string with name of collection to get info on
    service.http.get(
      `/servicesNS/nobody/${config.appName}/storage/collections/config/${collection}`,
      {},
      null,
      null,
      (err, res) => {
        if (err) {
          callback(err, res)
        }
        callback(err, res)
      }
    )
  }
}
export default kvstore

// @info Splunk SDK https://docs.splunk.com/Documentation/JavaScriptSDK
