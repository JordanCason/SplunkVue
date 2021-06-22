<template>
  <div id="app">
    <img alt="Vue logo" :src="origin + urlPrefix + 'app/exampleApp/img/logo.png'">
    <HelloWorld msg="Welcome to Your Vue.js App"/>
  </div>
</template>

<script>
import HelloWorld from '../../components/exampleApp/HellowWorld'
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'App',
  components: {
    HelloWorld
  },
  computed: {
    ...mapGetters(['origin', 'urlPrefix'])
    //a
  },
  mounted () {
    console.log(this.orgin, this.urlPrefix)
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
