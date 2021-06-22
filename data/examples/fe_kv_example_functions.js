kv_list() {
  let collectionService = splunkStack.mvc.createService({ owner: 'nobody' })
  // List all the current collections

  collectionService.get('storage/collections/config', null, function (
    err,
    res
  ) {
    for (var collection in res['data']['entry']) {
      console.log(res['data']['entry'][collection]['name'])
    }
  })
}

kv_create() {
  let kvStore = { name: 'csvUpdate' }
  let collectionService = splunkStack.mvc.createService({ owner: 'nobody' })
  // Create new kv store collection
  collectionService.post('storage/collections/config', kvStore, function (
    err,
    response
  ) {
    console.log(response)
  })
}

kv_schema() {
  let schema = {
    'field.id': 'number',
    'field.host': 'string',
    'field.ip_address': 'string'
  }
  let collectionService = splunkStack.mvc.createService({ owner: 'nobody' })
  collectionService.post(
    'storage/collections/config/csvUpdate',
    schema,
    function (err, res) {
      console.log(res)
    }
  )
}

kv_info() {
  let collectionService = splunkStack.mvc.createService({ owner: 'nobody' })
  // List all the current collections

  collectionService.get(
    'storage/collections/config/csvUpdate',
    null,
    function (err, res) {
      console.log(res)
    }
  )
}

kv_insert() {
  let record = {
    id: '34',
    ip_address: '1.2.3.4',
    host: 'google.com'
  }
  let header = { 'Content-Type': 'application/json' }
  let collectionService = splunkStack.mvc.createService({ owner: 'nobody' })
  collectionService.request(
    'storage/collections/data/csvUpdate',
    'POST',
    null,
    null,
    JSON.stringify(record),
    header,
    function (err, res) {
      console.log(res)
    }
  )
}

kv_read() {
  let collectionService = splunkStack.mvc.createService({ owner: 'nobody' })
  collectionService.get(
    'storage/collections/data/csvUpdate',
    null,
    function (err, res) {
      console.log(res)
      for (var record in res['data']) {
        console.log(JSON.stringify(res['data'][record]))
      }
    }
  )
}

kv_update() {
  let record = {
    id: `${Math.floor(Math.random() * 100)}`,
    ip_address: '1.2.3.4',
    host: 'google.com'
  }
  let header = { 'Content-Type': 'application/json' }
  let collectionService = splunkStack.mvc.createService({ owner: 'nobody' })
  collectionService.request(
    'storage/collections/data/csvUpdate/5db9e663a7164a016c7131b6', // Static Key
    'POST',
    null,
    null,
    JSON.stringify(record),
    header,
    function (err, res) {
      console.log(res)
    }
  )
}

kv_delete() {
  let collectionService = splunkStack.mvc.createService({ owner: 'nobody' })
  // Delete kv store collection
  collectionService.del(
    'storage/collections/config/csvUpdate',
    null,
    function (err, res) {
      console.log(res)
    }
  )
}