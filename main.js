let { demo } = require('./core/Demo.js')
let { config } = require('./config.js')
let { runningQueueDispatcher } = require('./lib/RunningQueueDispatcher.js')
let {
  debugInfo, logInfo, infoLog, warnInfo, errorInfo, clearLogFile
} = require('./lib/LogUtils.js')
let { commonFunctions } = require('./lib/CommonFunction.js')
let { unlocker } = require('./lib/Unlock.js')
logInfo('======校验是否重复运行=======')
// 检查脚本是否重复运行
commonFunctions.checkDuplicateRunning()
runningQueueDispatcher.addRunningTask()
/***********************
 * 初始化
 ***********************/
logInfo('======校验无障碍功能======')
// 检查手机是否开启无障碍服务
try {
  auto.waitFor()
} catch (e) {
  warnInfo('auto.waitFor()不可用')
  auto()
}
logInfo('---前置校验完成;启动系统--->>>>')

logInfo('======解锁======')
try {
  unlocker.exec()
} catch (e) {
  errorInfo('解锁发生异常, 三分钟后重新开始' + e)
  commonFunctions.setUpAutoStart(3)
  runningQueueDispatcher.removeRunningTask()
  exit()
}
logInfo('解锁成功')
if (!requestScreenCapture(false)) {
  errorInfo('请求截图失败')
  runningQueueDispatcher.removeRunningTask()
  exit()
} else {
  logInfo('请求截图权限成功')
}
/************************
 * 主程序
 ***********************/
try {
  commonFunctions.showDialogAndWait(false)
  demo.start()
} catch (e) {
  errorInfo('执行发生异常' + e)
} finally {
  runningQueueDispatcher.removeRunningTask()
}
