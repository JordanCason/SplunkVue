import kvstore from '../../../helpers/mongo'

const state = {
  origin: '',
  urlPrefix: '',
  analyst: '',
  timeService: {}
}

const getters = {
  origin (state) {
    return state.origin
  },
  urlPrefix (state) {
    return state.urlPrefix
  },
  analyst (state) {
    return state.analyst
  },
  calculatedServerTime (state) {
    // @dev braking vuex gitter caching
    return () => Math.floor(Date.now() / 1000) + state.timeService.delta
  }
}

const actions = {
  setOrigin (context, string) {
    context.commit('setOrigin', string)
  },
  setPrefix (context, string) {
    context.commit('setPrefix', string)
  },
  setUsername (context) {
    return new Promise((resolve) => {
      kvstore.userInfo((err, data) => {
        if (err) {
          console.error('Cant Retreave User Name: ', err)
        }
        const timeService = {
          server: Math.floor(Date.parse(data.response.headers.date) / 1000),
          client: Math.floor(Date.now() / 1000)
        }
        timeService.delta = Math.floor(timeService.server - timeService.client)
        const analyst = data.realname.replace(/(.+?), (.+?)( |$).*/, '$2 $1')
        context.commit('setUsername', analyst)
        context.commit('setTimeService', timeService)
        resolve()
      })
    })
  },
  calculatedServerTime (context) {
    return Math.floor(Date.now() / 1000) + state.timeService.delta
  }
}

const mutations = {
  setOrigin (state, string) {
    state.origin = string
  },
  setPrefix (state, string) {
    state.urlPrefix = string
  },
  setUsername (state, data) {
    state.analyst = data
  },
  setTimeService (state, data) {
    state.timeService = data
  }
}

export default {
  state,
  getters,
  actions,
  mutations
}
