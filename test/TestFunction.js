/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-28 08:59:15
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-11-30 23:52:22
 * @Description: 
 */
let singletoneRequire = require('../SingletonRequirer.js')(runtime, this)
let {
  debugInfo, debugForDev, logInfo, infoLog, warnInfo, errorInfo
} = singletoneRequire('LogUtils')
let commonFunctions = singletoneRequire('CommonFunction')
let runningQueueDispatcher = singletoneRequire('RunningQueueDispatcher')

function testSleepTime() {
  toastLog(commonFunctions.getSleepTime())
}

function checkRuntimeStatus() {
  commonFunctions.showRuntimeStatus()
}

// checkRuntimeStatus()
commonFunctions.updateSleepTime(5, true)