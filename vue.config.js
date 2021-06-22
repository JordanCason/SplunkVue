// vue.config.js
const CopyPlugin = require('copy-webpack-plugin');
const path = require('path')
const projectRoot = path.resolve(__dirname)
const config = require('./splunk.config.json')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const minimist = require('minimist')
const args = minimist(process.argv)

// @dev custom webpack plugin to format dashbord html for splunk
class SplunkWebpackPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('SplunkWebpackPlugin', (compilation) => {
      compilation.hooks.htmlWebpackPluginAfterHtmlProcessing.
      tapAsync('SplunkWebpackPlugin', (data, callback) => {

        // @dev fix broken html tags so splunk can render the html page
        data.html = data.html.
        replace(/(<\/head>)/g, "\n$1")
        data.html = data.html.
        replace(/(meta|link)(.+?[^\/])>/g, "$1$2 />")

        // @dev match webpack injected bundels and replace with corect format
        // and SPLUNKWEB_URL_PREFIX prefix to get the base url when renderd
        data.html = data.html.
        replace(/(src|href)(=.)\/(.+?)\/appserver\/static\/(.+?)/g,
                "$1$2{{SPLUNKWEB_URL_PREFIX}}/static/app/$3/$4")

        // @dev get a list of maches for our corected splunk injection links
        let scriptMatchs = data.html
        .match(/(\{\{SPLUNKWEB_URL_PREFIX\}\}\/static\/app\/.+?(\.js))/g)

        // @dev remove injected script tags
        data.html = data.html
        .replace(/<script.+?\{\{SPLUNKWEB_URL_PREFIX\}\}\/static\/app\/.+?<\/script>/g, "")

        let injection = ''
        for(let i=0; i < scriptMatchs.length; i++) {
          injection += `
          var s = document.createElement('script');
          s.type = 'text/javascript';
          s.async = true;
          s.src = '${scriptMatchs[i]}';
          var x = document.getElementsByTagName('script')[0];
          x.parentNode.insertBefore(s, x);
          `
        }
        // @dev dynamic script injection at the end of the require function
        data.html = data.html.replace(/(require[^]+?)(\}\)[^]*?<\/script>)/g, `$1${injection}\n$2`)
        callback(null, data);
      })
    })
  }
}
const entrys = {}
const plugins = []
const copy = []
if (args.dashboard === 'all') {
  Object.keys(config.dashboards).forEach((build) => {
    if (config.dashboards[build].type === 'html') {
      entrys[build] = config.dashboards[build].entry.path 
      plugins.push(new HtmlWebpackPlugin({
        ...config.dashboards[build].plugin,
        template: projectRoot + config.dashboards[build].plugin.template,
        filename: projectRoot + config.dashboards[build].plugin.filename
      }))
    } else if (config.dashboards[build].type === 'xml') {
      entrys[build] = config.dashboards[build].entry.path 
      plugins.push(new CopyPlugin([{
        from: projectRoot + config.dashboards[build].xmlEntry.path,
        to: projectRoot + '/build/' + config.appName + '/local/data/ui/views/' + config.dashboards[build].xmlEntry.name + '.xml'
      }]))
    }
  })
} else {
  entrys[args.dashboard] = config.dashboards[args.dashboard].entry.path 
  plugins.push(new HtmlWebpackPlugin({
    ...config.dashboards[args.dashboard].plugin,
    template: projectRoot + config.dashboards[args.dashboard].plugin.template,
    filename: projectRoot + config.dashboards[args.dashboard].plugin.filename
  }))
}

module.exports = {
  chainWebpack: config => {
    // @dev changes the existing htmlwebpackplugin provided by vue
    // might need to add reuseExistingChunk: true to splitChunks if
    // it starts braking with multiple dashbords. Or just remove the
    // chunking optimization
    config.optimization.delete('splitChunks')
    config.plugins.delete('html')
    config.plugins.delete('preload')
    config.plugins.delete('prefetch')
  },
  filenameHashing: false,
  // @dev output directory for the webpack build
  outputDir: config.outputDirectory,
  // @dev splunk server static assets
  assetsDir: config.appName + '/appserver/static',
  configureWebpack: config => {
    config.devtool = args['source-map']
    // @dev tools avalible to us in the splunk env allready
    config.externals = /(splunkjs|jquery|underscore)/i
    config.entry = entrys
    config.plugins = [
      ...config.plugins,
      ...plugins,
      new SplunkWebpackPlugin()
    ]
  }
}
