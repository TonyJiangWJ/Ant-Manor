let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
let accountChange = require('../lib/AlipayAccountManage.js').changeAccount
let logUtils = singletonRequire('LogUtils')
let floatyInstance = singletonRequire('FloatyUtil')
let commonFunctions = singletonRequire('CommonFunction')
let widgetUtils = singletonRequire('WidgetUtils')
let runningQueueDispatcher = singletonRequire('RunningQueueDispatcher')
let fileUtils = singletonRequire('FileUtils')
let automator = singletonRequire('Automator')
let unlocker = require('../lib/Unlock.js')
let LogFloaty = singletonRequire('LogFloaty')
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog } = singletonRequire('LogUtils')

let localOcr = require('../lib/LocalOcrUtil.js')

let VillageRunner = require('../core/VillageRunner.js')
let villageConfig = config.village_config
runningQueueDispatcher.addRunningTask()
// 注册自动移除运行中任务
commonFunctions.registerOnEngineRemoved(function () {
  // 重置自动亮度
  config.resetBrightness && config.resetBrightness()
  if (config.auto_lock && unlocker.needRelock() === true) {
    logUtils.debugInfo('重新锁定屏幕')
    automator.lockScreen()
  }
  // 移除运行中任务
  runningQueueDispatcher.removeRunningTask(true, false,
    () => {
      // 保存是否需要重新锁屏
      unlocker.saveNeedRelock()
      config.isRunning = false
    }
  )
}, 'main')
if (!commonFunctions.ensureAccessibilityEnabled()) {
  errorInfo('获取无障碍权限失败')
  exit()
}
unlocker.exec()
commonFunctions.requestScreenCaptureOrRestart()

if (!floatyInstance.init()) {
  toast('创建悬浮窗失败')
  exit()
}
floatyInstance.enableLog()


openMyVillage()

floatyInstance.setFloatyText('打开并等待')
VillageRunner.waitForLoading()
sleep(1000)
floatyInstance.setFloatyInfo({ x: villageConfig.village_reward_click_x, y: villageConfig.village_reward_click_y }, '点击收集')
// 自动点击自己的能量豆
automator.click(villageConfig.village_reward_click_x, villageConfig.village_reward_click_y)
// 签到
VillageRunner.speedAward(true)

LogFloaty.pushLog('执行完毕')
exit()





function openMyVillage () {
  app.startActivity({
    action: 'VIEW',
    data: 'alipays://platformapi/startapp?appId=68687809',
    packageName: 'com.eg.android.AlipayGphone'
  })
}