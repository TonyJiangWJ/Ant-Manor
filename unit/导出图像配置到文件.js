let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let FileUtils = singletonRequire('FileUtils')
let currentWorkPath = FileUtils.getCurrentWorkPath()
let configPath = currentWorkPath + '/config_data/'

let village_config = config.village_config
let fodder_config = config.fodder_config

console.show()
Object.keys(village_config).forEach(key => {
  let filePath = configPath + 'village/' + key + '.data'
  if (files.exists(filePath)) {
    console.verbose('导出配置：', key)
    files.write(filePath, village_config[key])
  } else {
    console.warn('配置文件不存在 跳过导出：', key)
  }
})
Object.keys(fodder_config).forEach(key => {
  let filePath = configPath + 'fodder/' + key + '.data'
  if (files.exists(filePath)) {
    console.verbose('导出配置：', key)
    files.write(filePath, fodder_config[key])
  } else {
    console.warn('配置文件不存在 跳过导出：', key)
  }
})