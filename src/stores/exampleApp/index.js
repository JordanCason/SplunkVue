import Vuex from 'vuex'
import Vue from 'vue'
import initState from './modules/initState'

Vue.config.devtools = true
Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    initState
  }
})
