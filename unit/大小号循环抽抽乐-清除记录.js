
let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let storageFactory = singletonRequire('StorageFactory')

let DAILY_TASK_DONE = "DRAWING_DAILY_TASK_DONE"
storageFactory.initFactoryByKey(DAILY_TASK_DONE, { executed: {} })


if (config.accounts && config.accounts.length > 1) {
  // 循环执行签到任务
  config.accounts.forEach((accountInfo, idx) => {
    let { account } = accountInfo
    setNotExecuted(account)
  })
}

function setNotExecuted (currentRunningAccount) {
  let currentStorage = storageFactory.getValueByKey(DAILY_TASK_DONE)
  currentStorage.executed[currentRunningAccount] = false
  storageFactory.updateValueByKey(DAILY_TASK_DONE, currentStorage)
}
