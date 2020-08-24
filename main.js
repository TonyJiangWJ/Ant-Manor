/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-27 09:03:57
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-05-07 10:43:32
 * @Description: 
 */
let { config } = require('./config.js')(runtime, this)
let singletonRequire = require('./lib/SingletonRequirer.js')(runtime, this)

let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog, debugForDev, clearLogFile } = singletonRequire('LogUtils')

let commonFunctions = singletonRequire('CommonFunction')

if (config.single_script) {
  logInfo('======单脚本运行直接清空任务队列=======')
  runningQueueDispatcher.clearAll()
}
logInfo('======加入任务队列，并关闭重复运行的脚本=======')
runningQueueDispatcher.addRunningTask()
let FloatyInstance = singletonRequire('FloatyUtil')
let automator = singletonRequire('Automator')
let tryRequestScreenCapture = singletonRequire('TryRequestScreenCapture')
let unlocker = require('./lib/Unlock.js')
let manorRunner = require('./core/AntManorRunner.js')
/***********************
 * 初始化
 ***********************/
logInfo('======校验无障碍功能======')
// 检查手机是否开启无障碍服务
if (!commonFunctions.checkAccessibilityService()) {
  try {
    auto.waitFor()
  } catch (e) {
    warnInfo('auto.waitFor()不可用')
    auto()
  }
}

logInfo('---前置校验完成;启动系统--->>>>')
// 打印运行环境信息
if (files.exists('version.json')) {
  let content = JSON.parse(files.read('version.json'))
  logInfo(['版本信息：{} nodeId:{}', content.version, content.nodeId])
} else if (files.exists('project.json')) {
  let content = JSON.parse(files.read('project.json'))
  logInfo(['版本信息：{}', content.versionName])
} else {
  logInfo('无法获取脚本版本信息')
}
logInfo(['AutoJS version: {}', app.autojs.versionName])
logInfo(['device info: {} {} {}', device.brand, device.product, device.release])

logInfo(['设备分辨率：[{}, {}]', config.device_width, config.device_height])
logInfo('======解锁======')
try {
  unlocker.exec()
} catch (e) {
  let currentDate = new Date()
  let sleepTime = 3
  if (currentDate.getHours() <= 7 && currentDate.getHours() >= 0) {
    // 夜间15分钟
    sleepTime = 15
  }
  errorInfo(['解锁发生异常, {}分钟后重新开始' + e, sleepTime])
  commonFunctions.printExceptionStack(e)
  commonFunctions.setUpAutoStart(sleepTime)
  runningQueueDispatcher.removeRunningTask()
  exit()
}
logInfo('解锁成功')
let screenPermission = false
let actionSuccess = commonFunctions.waitFor(function () {
  if (config.request_capture_permission) {
    screenPermission = tryRequestScreenCapture()
  } else {
    screenPermission = requestScreenCapture(false)
  }
}, 15000)

if (!actionSuccess || !screenPermission) {
  errorInfo('请求截图失败, 设置6秒后重启')
  runningQueueDispatcher.removeRunningTask()
  sleep(6000)
  runningQueueDispatcher.executeTargetScript(FileUtils.getRealMainScriptPath())
  exit()
} else {
  logInfo('请求截屏权限成功')
}
// 初始化悬浮窗
if (!FloatyInstance.init()) {
  runningQueueDispatcher.removeRunningTask()
  // 悬浮窗初始化失败，6秒后重试
  sleep(6000)
  runningQueueDispatcher.executeTargetScript(FileUtils.getRealMainScriptPath())
  exit()
}
/************************
 * 主程序
 ***********************/
function mainExec() {
  commonFunctions.showDialogAndWait(true)
  commonFunctions.listenDelayStart()
  manorRunner.start()
} 

if (config.develop_mode) {
  mainExec()
} else {
 
  try {
    mainExec()
  } catch (e) {
    commonFunctions.printExceptionStack(e)
    errorInfo('执行发生异常' + e + ' 三分钟后重启')
    commonFunctions.setUpAutoStart(3)
  }
}
if (config.auto_lock === true && unlocker.needRelock() === true) {
  debugInfo('重新锁定屏幕')
  automator.lockScreen()
}
events.removeAllListeners()
events.recycle()
FloatyInstance.close()
runningQueueDispatcher.removeRunningTask(true)
exit()
