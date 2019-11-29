/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-28 08:59:15
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2019-11-29 17:37:27
 * @Description: 
 */
let {commonFunctions} = require('../lib/CommonFunction.js')
let {runningQueueDispatcher} = require('../lib/RunningQueueDispatcher.js')
let {
  debugInfo, logInfo, infoLog, warnInfo, errorInfo, clearLogFile
} = require('./lib/LogUtils.js')

function testSleepTime() {
  toastLog(commonFunctions.getSleepTime())
}

function checkRuntimeStatus() {
  commonFunctions.showRuntimeStatus()
}

checkRuntimeStatus()