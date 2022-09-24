let { config } = require('../config.js')(runtime, this)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, this)
config.save_log_file = false
let _commonFunctions = singletonRequire('CommonFunction')
let resourceMonitor = require('../lib/ResourceMonitor.js')(runtime, global)
let { logInfo, errorInfo, warnInfo, debugInfo, infoLog } = singletonRequire('LogUtils')
let FloatyInstance = singletonRequire('FloatyUtil')
let paddleOcr = singletonRequire('PaddleOcrUtil')
if (!FloatyInstance.init()) {
  errorInfo('初始化悬浮窗失败')
}
if (!requestScreenCapture()) {
  toastLog('请求截图权限失败')
  exit()
}
let zuosi = true

function captureAndRecognize () {
  FloatyInstance.setFloatyPosition(device.width, device.height)
  console.verbose('准备获取截图')
  let img = captureScreen()
  console.verbose('获取截图完毕')
  let region = config.COUNT_DOWN_REGION
  debugInfo(['region:{}', JSON.stringify(config.COUNT_DOWN_REGION)])
  img = images.clip(img, region[0], region[1], region[2], region[3])
  let result = ''
  if (zuosi) {
    img = images.resize(img, [parseInt(img.width * 2), parseInt(img.height * 2)])
    // img = images.fromBase64(images.toBase64(images.resize(img, [parseInt(img.width * 2), parseInt(img.height * 2)])))
  }
  img = images.interval(images.grayscale(img), '#FFFFFF', 50)
  result = paddleOcr.recognize(img)
  if (result) {
    result = result.replace(/\n/g, '').replace(/\s/g, '')
  }
  debugInfo(['使用paddleOcr识别倒计时时间文本: {}', result])
  debugInfo(['图片数据：[data:image/png;base64,{}]', images.toBase64(img)])
  img.recycle()
  FloatyInstance.setFloatyInfo({ x: region[0], y: region[1] }, result)
}


// 操作按钮
let clickButtonWindow = floaty.rawWindow(
  <vertical>
    <button id="toggle" text="作死" />
    <button id="captureAndOcr" text="截图识别" />
    <button id="captureAndOcrExit" text="截图识别并重启" />
    <button id="closeBtn" text="退出" />
  </vertical>
);
ui.run(function () {
  clickButtonWindow.setPosition(device.width / 2 - ~~(clickButtonWindow.getWidth() / 2), device.height * 0.65)
  if (zuosi) {
    clickButtonWindow.toggle.setText('不作死')
  } else {
    clickButtonWindow.toggle.setText('作死')
  }
})

clickButtonWindow.toggle.click(function () {
  zuosi = !zuosi
  if (zuosi) {
    clickButtonWindow.toggle.setText('不作死')
  } else {
    clickButtonWindow.toggle.setText('作死')
  }
})

// 点击识别
clickButtonWindow.captureAndOcr.click(function () {
  result = []
  ui.run(function () {
    clickButtonWindow.setPosition(device.width, device.height)
  })
  setTimeout(() => {
    captureAndRecognize()
    ui.run(function () {
      clickButtonWindow.setPosition(device.width / 2 - ~~(clickButtonWindow.getWidth() / 2), device.height * 0.65)
    })
  }, 500)
})

// 点击识别并退出
clickButtonWindow.captureAndOcrExit.click(function () {
  result = []
  ui.run(function () {
    clickButtonWindow.setPosition(device.width, device.height)
  })
  setTimeout(() => {
    captureAndRecognize()
    ui.run(function () {
      clickButtonWindow.setPosition(device.width / 2 - ~~(clickButtonWindow.getWidth() / 2), device.height * 0.65)
    })
    setTimeout(function () {
      FloatyInstance.setFloatyText('再见')
      threads.start(function () {
        sleep(1000)
        _commonFunctions.setUpAutoStart(0.08)
        exit()
      })
    }, 500)
  }, 500)
})

// 点击关闭
clickButtonWindow.closeBtn.click(function () {
  exit()
})

setInterval(function () { }, 4000)