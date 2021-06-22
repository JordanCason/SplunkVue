// https://docs.cypress.io/api/introduction/api.html

describe('Visit Splunk Login', () => {
  it('Visits the Splunk root url', () => {
    cy.visit('/')
    cy.get('form').contains('Sign In')
    // cy.contains('h1', 'Welcome to Your Vue.js App')
  })
})

describe('Test Login Credentials', () => {
  it('Successfully log in', () => {
    cy.request('GET', '/en-US/account/insecurelogin?loginType=splunk&username=admin&password=changeme2')
  })
})

describe('The COLS-NA application is installed', () => {
  it('The Splunk app is present', () => {
    cy.request('GET', '/en-US/account/insecurelogin?loginType=splunk&username=admin&password=changeme2')
    cy.visit('/en-US/app/exampleApp/dashboards')
  })
})
