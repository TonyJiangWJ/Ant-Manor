let { config } = require('./config.js')
let { runningQueueDispatcher } = require('./lib/RunningQueueDispatcher.js')
let {
  debugInfo, logInfo, infoLog, warnInfo, errorInfo, clearLogFile, appendLog
} = require('./lib/LogUtils.js')
let { commonFunctions } = require('./lib/CommonFunction.js')
let { unlocker } = require('./lib/Unlock.js')
let { manorRunner } = require('./core/AntManorRunner.js')
logInfo('======校验是否重复运行=======')
// 检查脚本是否重复运行
commonFunctions.checkDuplicateRunning()
runningQueueDispatcher.addRunningTask()
/***********************
 * 初始化
 ***********************/
logInfo('======校验无障碍功能======')
// 检查手机是否开启无障碍服务
if (!commonFunctions.checkAccessibilityService(true)) {
  try {
    auto.waitFor()
  } catch (e) {
    warnInfo('auto.waitFor()不可用')
    auto()
  }
}

logInfo('---前置校验完成;启动系统--->>>>')

logInfo('======解锁======')
try {
  unlocker.exec()
} catch (e) {
  let currentDate = new Date()
  let sleep = 3
  if (currentDate.getHours() <= 7 && currentDate.getHours() >= 0) {
    // 夜间15分钟
    sleep = 15
  }
  errorInfo(['解锁发生异常, {}分钟后重新开始' + e, sleep])
  commonFunctions.setUpAutoStart(sleep)
  runningQueueDispatcher.removeRunningTask()
  exit()
}
logInfo('解锁成功')
let screenPermission = false
let actionSuccess = commonFunctions.waitFor(function () {
  if (!requestScreenCapture(false)) {
    screenPermission = false
  } else {
    screenPermission = true
  }
}, 1000)
if (!actionSuccess || !screenPermission) {
  errorInfo('请求截图失败, 设置6秒后重启')
  runningQueueDispatcher.removeRunningTask()
  commonFunctions.setUpAutoStart(0.1)
  exit()
} else {
  logInfo('请求截屏权限成功')
}
/************************
 * 主程序
 ***********************/
try {
  commonFunctions.showDialogAndWait(false)
  manorRunner.start()
} catch (e) {
  errorInfo('执行发生异常' + e + ' 三分钟后重启')
  commonFunctions.setUpAutoStart(3)
} finally {
  runningQueueDispatcher.removeRunningTask()
}
