import Vue from 'vue'
import store from '../../stores/exampleApp'
// import router from '../../routers/arap'
import exampleVue from './exampleVue.vue'
// import Antd from 'ant-design-vue'
// import 'ant-design-vue/dist/antd.css'

Vue.config.productionTip = false
Vue.config.devtools = true
// Vue.use(Antd)

const proxyHttp = new splunkjs.ProxyHttp('/en-US/splunkd/__raw')

/*
service is getting tied to the window because it's
needed when our faude import starts to load.
This would be different if we were importing
the Splunk SDK our selves in the vue components.
*/
window.service = new splunkjs.Service(
  proxyHttp,
  { sessionKey: document.cookie.match(/splunkweb.+?=(.+?)($|;)/)[1] }
)

// @dev add initial data to the store
store.commit('setOrigin', splunkStack.origin)
store.commit('setPrefix', splunkStack.urlPrefix)
store.dispatch('setUsername').then(() => {
  // @dev render the splunk toolbar
  $('header').remove()
  new splunkStack.LayoutView({
    hideAppBar: true,
    hideAppsList: true,
    hideChrome: false,
    hideSplunkBar: false,
    hideFooter: true,
    layout: 'scrolling'
  }).render()

  // @dev remove additional splunk nodes that are not needed
  document.querySelector('[role]').remove()
  // Only one role element in Splunk 8
  // document.querySelector('[role]').remove()
  document.querySelector('body > a').remove()
  document.querySelector('#navSkip').remove()

  // @dev change order of header and #app nodes
  const insertAfter = (insert, Node) => {
    Node.parentNode.insertBefore(insert, Node.nextSibling)
  }
  insertAfter(
    document.querySelector('#app'),
    document.querySelector('header')
  )

  // @dev mount the vue dom tree
  new Vue({
    store,
    // router,
    render: h => h(exampleVue)
  }).$mount('#app')
})
