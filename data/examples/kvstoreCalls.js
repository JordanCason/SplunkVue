console.log(service)
console.log(proxyHttp)
console.log(splunkjs2)
const test = splunkjs.config({
  proxyPath: "/en-US/splunkd",
  scheme: "http",
  host: "localhost",
  port: 8089,
  authenticate: function (done) {
    console.log(done)
  },
  onSessionExpired: function (authenticate, done) {
    console.log(done)
  },
  onDrilldown (drilldown) {
    console.log(drilldown)
  }
})
console.log(test)
console.log(document.cookie.match(/token_key=(.+);/)[1])

window.service2 = new splunkjs.Service(proxyHttp, {sessionKey: document.cookie.match(/splunkweb.+?=(.+?);/)[1]});
window.collection = new splunkjs.Service.Collection(service2, 'storage/collections/data/exampleKV', { owner: 'nobody', app: 'exampleApp', sharing: 'global' })
window.Endpoint = new splunkjs.Service.Endpoint(service2, 'storage/collections/data/exampleKV', { owner: 'nobody', app: 'exampleApp', sharing: 'global' })
window.Entity = new splunkjs.Service.Entity(service2, 'storage/collections/data/exampleKV', { owner: 'nobody', app: 'exampleApp', sharing: 'global' })
service2.typeahead('index=', 3, (data) => {console.log(data)})
service2.currentUser((err, data) => {console.log(data)})
Entity.get('', {"query": '{ "$or": [ { "Reviewed": "Good" }, { "Reviewed": "Bad" } ] }'}, (err, data) => {console.log(data)})
Entity.get('', {"query": '{ "IPAddress": "250.166.178.17" }'}, (err, data) => {console.log(data)})
collection.fetch( {"query": '{ "IPAddress": "250.166.178.17" }'}).always((data) => {console.log(JSON.parse(data))})


window.searchEndpoint = new splunkjs.Service.Endpoint(service2, 'search/jobs', { owner: 'nobody', app: 'exampleApp', sharing: 'global' })
searchEndpoint.service.oneshotSearch("| inputlookup exampleKV", {"id": "testJob"}, (err, result) => {console.log(result)})

service2.parse('| makeresults | eval test = "test"', (err, data) => {console.log(data)})

var prams = {
  method: "POST",
  headers: '{ 'Content-Type': 'application/json' }',
  post: '{"Analyst":"Jordan Cason","CountryCode":"CN","Domain":"https://richmond.com","IPAddress":"64.102.5.19","MID":"undefined","MalwareURI":"/dorian/noel/eulah","MalwareURL":"https://richmond.com/dorian/noel/eulah","Reviewed":"Good","_time":"2019-11-01T21:40:44.000+00:00","_user":"nobody","_key":"5dc02c06aeee3502c638f252"}'
}
Entity.post(prams, (err, data) => {console.log(err, data)})


proxyHttp.get(
      `/servicesNS/nobody/exampleApp/storage/collections/data/exampleKV`,
      { 'Content-Type': 'application/json' },
      function (err, res) {
        if (err) {
          console.error(err)
        }
        console.log('info2')
        console.log(res)
      }
    )
