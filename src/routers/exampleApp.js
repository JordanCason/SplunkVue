// import Vue from 'vue'
// import VueRouter from 'vue-router'
// import EmailTipper from '@/components/exampleApp/test2'
// import Welcome from '@/components/exampleApp/test1'
// import store from '@/stores/exampleApp/index'
// 
// Vue.use(VueRouter)
// 
// const routes = [
//   {
//     path: '/emailtipper',
//     name: 'emailtipper',
//     component: EmailTipper,
//     // component: () => import(/* webpackChunkName: "example" */ '@/components/exampleApp/test2'),
//     props: (route) => ({ query: route.query.q }),
//     meta: { checkNav: true }
//   },
//   {
//     path: '/welcome',
//     name: 'welcome',
//     component: Welcome,
//     meta: { checkNav: true }
//   },
//   {
//     path: '/',
//     redirect: '/welcome'
//   }
// //  {
// //     path: '/about',
// //     name: 'About',
// //     // route level code-splitting
// //     // this generates a separate chunk (about.[hash].js) for this route
// //     // which is lazy-loaded when the route is visited.
// //     component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
// //   }
// ]
// 
// const router = new VueRouter({
//   mode: 'hash',
//   base: '/en-US/app/exampleApp/example/',
//   routes
// })
// router.beforeEach((to, from, next) => {
//   store.dispatch('setNavigationSelectedKey', to.name)
//   if (from.name === to.name) {
//     next(false)
//   } else {
//     next()
//   }
// })
// // router.beforeEach((to, from, next) => {
// //   **JAM** Expose selectedKeys via vuex?
// //   console.log('here')
// //   if (to.matched.some(record => {
// //     return record.meta.checkNav
// //   })) {
// //     if (!store.getters.directNav) {
// //       console.log('manualnav')
// //       console.log(store.getters.navElement)
// //       next(false)
// //       router.push('hello')
// //     } else {
// //       next()
// //     }
// //   } else {
// //     next()
// //   }
// // })
// 
// export default router
