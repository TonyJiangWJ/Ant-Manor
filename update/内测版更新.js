let { config } = require('../config.js')(runtime, global)
config.github_latest_url = 'https://125.120.212.13:15212/alpha-release/manor-alpha.json'
let { updateDownloader } = require('../lib/UpdateChecker.js')
updateDownloader.downloadUpdate()