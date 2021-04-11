let customConfig = require('../extends/CustomConfig.js')
let { config } = require('../config.js')(runtime, this)
let obj = {}
Object.keys(customConfig).forEach(key => {
  obj[key] = config[key]
  log('key: ' + key + ' is: ' + config[key])
})

files.write('./newConfig.json', JSON.stringify(obj))