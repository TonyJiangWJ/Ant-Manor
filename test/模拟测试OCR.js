
let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
config.save_log_file = false
let commonFunctions = singletonRequire('CommonFunction')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog } = singletonRequire('LogUtils')
let FloatyInstance = singletonRequire('FloatyUtil')
let openCvUtil = require('../lib/OpenCvUtil.js')
let paddleOcr = singletonRequire('PaddleOcrUtil')
if (!FloatyInstance.init()) {
  errorInfo('初始化悬浮窗失败')
}
if (!requestScreenCapture()) {
  toastLog('请求截图权限失败')
  exit()
}
let villageConfig = config.village_config
// 摆摊摊位框选 带文字
villageConfig.booth_position_left = villageConfig.booth_position_left || [193, 1659, 436, 376]
villageConfig.booth_position_right = villageConfig.booth_position_right || [629, 1527, 386, 282]
// openMyVillage()
// checkAnyEmptyBooth()
doCheckAndDriveOut(captureScreen(), villageConfig.booth_position_left)
// captureAndOcr()

/**
 * 等待摆摊界面或者好友界面打开完成 寻找邮箱
 */
function waitForLoading () {
  let screen = captureScreen()
  let findPoint = openCvUtil.findByGrayBase64(screen, villageConfig.checking_mail_box)
  // 等待五秒
  let limit = 5
  while (limit-- > 0 && !findPoint) {
    sleep(1000)
    screen = captureScreen()
    findPoint = openCvUtil.findByGrayBase64(screen, villageConfig.checking_mail_box)
  }
  if (!!findPoint) {
    FloatyInstance.setFloatyInfo({ x: findPoint.centerX(), y: findPoint.centerY() }, '打开蚂蚁新村成功')
    sleep(1000)
  } else {
    errorInfo('打开蚂蚁新村失败', true)
  }
}
function openMyVillage () {
  app.startActivity({
    action: 'VIEW',
    data: 'alipays://platformapi/startapp?appId=68687809',
    packageName: 'com.eg.android.AlipayGphone'
  })
  sleep(3000)
  // waitForLoading()
}


/**
 * 查找空位，邀请好友摆摊
 */
function checkAnyEmptyBooth (notCheckDrive) {
  FloatyInstance.setFloatyText('准备查找是否有空位')
  sleep(1000)
  let screen = captureScreen()
  let point = openCvUtil.findByGrayBase64(screen, villageConfig.empty_booth)
  if (point) {
    FloatyInstance.setFloatyInfo({ x: point.centerX(), y: point.centerY() }, '有空位')
    sleep(1000)
    inviteFriend(point)
    sleep(1000)
    checkAnyEmptyBooth(notCheckDrive)
  } else {
    if (notCheckDrive) {
      // 第二次进入时无需继续检测超时
      return
    }
    warnInfo('无空位', true)
    let haveDriveOut = false
    // 移除超过一定时间的好友摊位
    haveDriveOut |= !!doCheckAndDriveOut(screen, villageConfig.booth_position_left)
    haveDriveOut |= !!doCheckAndDriveOut(screen, villageConfig.booth_position_right)
    sleep(1000)
    if (haveDriveOut) {
      checkAnyEmptyBooth(true)
    }
  }
}
/**
 * 校验并驱赶
 * @param {ImageWrapper} screen 
 * @param {array: [left, top, width, height]} region 
 */
function doCheckAndDriveOut (screen, region) {
  // let img = images.clip(screen, region[0], region[1], region[2], region[3])
  // let result = $ocr.detect(screen)
  // console.log('$ocr识别:' + JSON.stringify(result))
  // let recognizeText = paddleOcr.recognize(images.grayscale(img))
  let recognizeText = paddleOcr.recognize(screen, region)
  debugInfo(['识别文本：{}', recognizeText])
  // let regex = /.*(已停产|剩余经营.*)/
  // if (regex.test(recognizeText)) {
  //   FloatyInstance.setFloatyInfo({ x: region[0], y: region[1] }, '摊位超时：' + recognizeText)
  //   sleep(1000)

  // } else {
  //   debugInfo(['未找到超时摊位 区域：{}', JSON.stringify(region)])
  // }
  return false
}


// 识别结果和截图信息
let result = []
let img = null
let running = true
let capturing = true

/**
 * 截图并识别OCR文本信息
 */
function captureAndOcr() {
  capturing = true
  img && img.recycle()
  img = captureScreen()
  if (!img) {
    toastLog('截图失败')
  }
  let start = new Date()
  result = $ocr.detect(img)
  toastLog('耗时' + (new Date() - start) + 'ms')
  console.log('识别结果：', JSON.stringify(result))
  capturing = false
}
