import { createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import fs from 'fs'
import path from 'path'

const projectRoot = path.resolve(__dirname, '../../')
const scriptTemplate = fs.readFileSync(projectRoot + '/src/templates/exampleApp.html').toString()

beforeEach(() => {
  // eslint-disable-next-line no-eval
  eval([...scriptTemplate.matchAll(/<script>\n?(?<script>[^]+?)<\/script>?/gm)][0].groups.script)
})

test('sets "urlPrefix" value when "setPrefix" is committed', async () => {
  const localVue = createLocalVue()
  localVue.use(Vuex)
  /*
    Given the module system for the store with proxy, we need to
    access the state from the specific module.
  */
  const baseStore = await import('../../src/stores/exampleApp/index.js')
  const store = baseStore.default
  const state = store._modules.root.state.initState
  expect(state.urlPrefix).toBe('')
  store.commit('setPrefix', 'localhost')
  expect(state.urlPrefix).toBe('localhost')
})

test('retrieves "urlPrefix" value after "setPrefix" is committed', async () => {
  const localVue = createLocalVue()
  localVue.use(Vuex)
  const store = await import('../../src/stores/exampleApp/index.js')
  store.default.commit('setPrefix', 'localhost')
  expect(store.default.getters.urlPrefix).toBe('localhost')
})
