# Splunk Vue build system

Build system for injecting Vue application as a javascript dashboard. Build system also works well for getting away from the Splunk WYSIWYG (Web XML editor) for auto reloading on code changes. 

## Initial Setup

1. [Docker](https://docs.docker.com/install/) for running the Splunk container.
2. Node 
3. Source: Clone the project code into a local repo

```
   $ cd ~/git
   $ mkdir SplunkVue
   $ cd SplunkVue
   $ git clone https://github.com/JordanCason/SplunkVue.git
   $ cd SplunkVue
```

4. Dependencies: `npm install`

That's it. You're ready to go!

## Usage

1. Run `npm start` from the project root. This will automatically build, start, and monitor the project. Initial runs will be slow to startup since nothing will be cached in docker yet. Chromium will start by showing a wait page until the application server is accessible.


## Packaging

1. Generate `package.zip` by running `npm run package-uat`. This will result in the container shutting down and `package.zip` being written to the project root directory.
2. Generate `package.zip` for PROD by running `npm run package-prod`. This will result in the container shutting down and `package.zip` being written to the project root directory.

## Contributing

1. Clone it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D
