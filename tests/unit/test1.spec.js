import { shallowMount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import Welcome from '../../src/components/exampleApp/test1.vue'

const localVue = createLocalVue()

localVue.use(Vuex)

describe('exampleApp Welcome (test1.vue)', () => {
  let actions
  let getters
  let store

  beforeEach(() => {
    actions = {
      submitJSON2: jest.fn()
    }
    getters = {
      origin: jest.fn(),
      urlPrefix: jest.fn()
    }
    store = new Vuex.Store({
      actions,
      getters
    })
  })

  it('calls store action "submitJSON2" when submit button is clicked', () => {
    const wrapper = shallowMount(Welcome, { store, localVue })
    wrapper.find('button:nth-of-type(4)').trigger('click')
    expect(actions.submitJSON2).toHaveBeenCalled()
  })
})
