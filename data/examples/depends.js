(function() {
  define(["react", "splunkjs/splunk"], function(react, splunk_js_sdk){
    var http = new splunk_js_sdk.SplunkWebHttp();
    var service2 = new splunk_js_sdk.Service(
      http,
      {
        owner: "nobody",
        app: 'tsd',
        sharing: "app",
      }
    )
    service2.oneshotSearch('| rest /services/authentication/users splunk_server=local | dedup splunk_server | table splunk_server',
    { output_mode: 'JSON' }, (err, results) => {
      if (err) {
        console.error(err)
      } else {
      console.log(results)
      }
    })
  })
})()
