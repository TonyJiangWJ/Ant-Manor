/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-27 09:03:57
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-09-17 20:01:24
 * @Description: 
 */
'ui';

let currentEngine = engines.myEngine().getSource() + ''
let isRunningMode = currentEngine.endsWith('/config.js') && typeof module === 'undefined'
let is_pro = Object.prototype.toString.call(com.stardust.autojs.core.timing.TimedTask.Companion).match(/Java(Class|Object)/)
importClass(android.text.TextWatcher)
importClass(android.view.View)
importClass(android.view.MotionEvent)

// 执行配置
var default_config = {
  timeout_existing: 6000,
  timeout_findOne: 1000,
  timeout_unlock: 1000,
  password: '',
  is_alipay_locked: false,
  alipay_lock_password: '',
  color_offset: 20,
  // 是否显示调试日志信息
  show_debug_log: true,
  // 是否toast调试日志
  toast_debug_info: false,
  show_engine_id: false,
  develop_mode: false,
  saveLogFile: true,
  // 完成后通过手势kill支付宝应用，目前只支持MIUI全面屏手势 默认关闭
  killAppWithGesture: false,
  // 是否使用加速卡 默认为true
  useSpeedCard: true,
  starBallScore: 205,
  // 倒计时结束 等待的窗口时间
  windowTime: 5,
  recheckTime: 5,
  device_width: device.width,
  device_height: device.height,
  auto_lock: false,
  lock_x: 150,
  lock_y: 970,
  // 锁屏启动关闭提示框
  dismiss_dialog_if_locked: true,
  // 单脚本模式 是否只运行一个脚本 不会同时使用其他的 开启单脚本模式 会取消任务队列的功能。
  // 比如同时使用其他脚本 则保持默认 false 否则设置为true 无视其他运行中的脚本
  single_script: false,
  // 延迟启动时延 5秒 悬浮窗中进行的倒计时时间
  delayStartTime: 5,
  // 是否是AutoJS Pro  需要屏蔽部分功能，暂时无法实现：生命周期监听等 包括通话监听
  is_pro: is_pro,
  // 是否捡屎
  pick_shit: false,
  request_capture_permission: true,
  auto_set_bang_offset: true,
  bang_offset: 0,
  async_waiting_capture: true,
  capture_waiting_time: 500,
  useOcr: true,
  apiKey: '0dGhhIf529lp1bB7vdH5vYFe',
  secretKey: 'Pk2M9CKcwsx0075Cslso0lUfIp8D5Lut'
}

// 配置缓存的key值
let CONFIG_STORAGE_NAME = 'chick_config_version'
let PROJECT_NAME = '蚂蚁庄园'
var storageConfig = storages.create(CONFIG_STORAGE_NAME)
var config = {}
if (!storageConfig.contains('password')) {
  toastLog('使用默认配置')
  // 存储默认配置到本地
  Object.keys(default_config).forEach(key => {
    storageConfig.put(key, default_config[key])
  })
  config = default_config
} else {
  Object.keys(default_config).forEach(key => {
    let storedConfigItem = storageConfig.get(key)
    if (storedConfigItem === undefined) {
      storedConfigItem = default_config[key]
    }
    config[key] = storedConfigItem
  })
}
log('当前配置信息：' + JSON.stringify(config))
if (!isRunningMode) {
  if (config.device_height === 0 || config.device_width === 0) {
    if (!currentEngine.endsWith('/config.js')) {
      toastLog('请先运行config.js并输入设备宽高')
      exit()
    }
  }
  module.exports = function (__runtime__, scope) {
    if (typeof scope.config_instance === 'undefined') {
      scope.config_instance = {
        config: config,
        default_config: default_config,
        storage_name: CONFIG_STORAGE_NAME,
        project_name: PROJECT_NAME
      }
    }
    return scope.config_instance
  }

} else {



  let loadingDialog = null
  let _hasRootPermission = files.exists("/sbin/su") || files.exists("/system/xbin/su") || files.exists("/system/bin/su")
  let commonFunctions = require('./lib/prototype/CommonFunction.js')
  let AesUtil = require('./lib/AesUtil.js')


  let inputDeviceSize = function () {
    return Promise.resolve().then(() => {
      return dialogs.rawInput('请输入设备宽度：', config.device_width + '')
    }).then(x => {
      if (x) {
        let xVal = parseInt(x)
        if (isFinite(xVal) && xVal > 0) {
          config.device_width = xVal
        } else {
          toast('输入值无效')
        }
      }
    }).then(() => {
      return dialogs.rawInput('请输入设备高度：', config.device_height + '')
    }).then(y => {
      if (y) {
        let yVal = parseInt(y)
        if (isFinite(yVal) && yVal > 0) {
          config.device_height = yVal
        } else {
          toast('输入值无效')
        }
      }
    })
  }
  let setDeviceSizeText = function () {
    ui.deviceSizeText.text(config.device_width + 'px ' + config.device_height + 'px')
  }
  let resetUiValues = function () {
    ui.password.text(config.password)
    ui.isAlipayLockedChkBox.setChecked(config.is_alipay_locked)
    ui.alipayLockPasswordInpt.setText(config.alipay_lock_password)
    ui.alipayLockPasswordContainer.setVisibility(config.is_alipay_locked ? View.VISIBLE : View.GONE)
    ui.colorThresholdInput.text('' + config.color_offset)
    let precent = parseInt(config.color_offset / 255 * 100)
    ui.colorThresholdSeekbar.setProgress(precent)

    ui.useSpeedCardChkBox.setChecked(config.useSpeedCard)
    ui.windowTimeInpt.text('' + config.windowTime)
    ui.recheckTimeInpt.text('' + config.recheckTime)
    ui.showDebugLogChkBox.setChecked(config.show_debug_log)
    ui.saveLogFileChkBox.setChecked(config.saveLogFile)
    ui.showEngineIdChkBox.setChecked(config.show_engine_id)
    ui.developModeChkBox.setChecked(config.develop_mode)
    ui.starBallScoreInpt.setText(config.starBallScore + '')
    ui.delayStartTimeInpt.text(config.delayStartTime + '')
    ui.singleScriptChkBox.setChecked(config.single_script)
    ui.requestCapturePermissionChkBox.setChecked(config.request_capture_permission)
    ui.lockX.text(config.lock_x + '')
    ui.lockXSeekBar.setProgress(parseInt(config.lock_x / config.device_width * 100))
    ui.lockY.text(config.lock_y + '')
    ui.lockYSeekBar.setProgress(parseInt(config.lock_y / config.device_height * 100))
    ui.autoLockChkBox.setChecked(config.auto_lock)
    ui.lockPositionContainer.setVisibility(config.auto_lock && !_hasRootPermission ? View.VISIBLE : View.INVISIBLE)
    ui.lockDescNoRoot.setVisibility(!_hasRootPermission ? View.VISIBLE : View.INVISIBLE)
    ui.bangOffsetText.text('' + config.bang_offset)
    ui.dismissDialogIfLockedChkBox.setChecked(config.dismiss_dialog_if_locked)

    ui.pickShitChkBox.setChecked(config.pick_shit)
    // 截图等待时间配置
    ui.captureWaitingTimeInpt.text(config.capture_waiting_time + '')
    ui.asyncWaitingCaptureChkBox.setChecked(config.async_waiting_capture)
    ui.asyncWaitingCaptureContainer.setVisibility(config.async_waiting_capture ? View.VISIBLE : View.GONE)
    setDeviceSizeText()
  }

  threads.start(function () {
    loadingDialog = dialogs.build({
      title: "加载中...",
      progress: {
        max: -1
      },
      cancelable: false
    }).show()
    setTimeout(function () {
      loadingDialog.dismiss()
    }, 3000)
  })

  let TextWatcherBuilder = function (textCallback) {
    return new TextWatcher({
      onTextChanged: (text) => {
        textCallback(text + '')
      },
      beforeTextChanged: function (s) { }
      ,
      afterTextChanged: function (s) { }
    })
  }
  setTimeout(function () {
    ui.layout(
      <drawer>
        <vertical>
          <appbar>
            <toolbar id="toolbar" title="运行配置" />
          </appbar>
          <frame>
            <ScrollView>
              <vertical padding="24 0">
                {/* 锁屏密码 */}
                <horizontal gravity="center">
                  <text text="锁屏密码：" />
                  <input id="password" inputType="textPassword" layout_weight="80" />
                </horizontal>
                <checkbox id="isAlipayLockedChkBox" text="支付宝是否锁定" />
                <horizontal gravity="center" id="alipayLockPasswordContainer">
                  <text text="支付宝手势密码对应的九宫格数字：" textSize="10sp" />
                  <input id="alipayLockPasswordInpt" inputType="textPassword" layout_weight="80" />
                </horizontal>
                <horizontal w="*" h="1sp" bg="#cccccc" margin="5 5"></horizontal>
                <horizontal gravity="center">
                  <text text="设备宽高：" textColor="black" textSize="16sp" />
                  <text id="deviceSizeText" text="" />
                  <button id="changeDeviceSizeBtn" >修改</button>
                </horizontal>
                <horizontal w="*" h="1sp" bg="#cccccc" margin="5 5"></horizontal>
                {/* 颜色识别 */}
                <text text="颜色相似度（拖动为百分比，实际使用0-255）" textColor="black" textSize="16sp" />
                <horizontal gravity="center">
                  <text id="colorThresholdInput" />
                  <seekbar id="colorThresholdSeekbar" progress="20" layout_weight="85" />
                </horizontal>
                {/* 是否使用加速卡 */}
                <checkbox id="useSpeedCardChkBox" text="是否使用加速卡" />
                <checkbox id="pickShitChkBox" text="是否捡屎" />
                <text text="喂食等待窗口时间是为了避免倒计时计算不准确而加入的冗余时间，不建议设置成0" textSize="8sp" />
                <horizontal padding="10 0" gravity="center">
                  <text text="喂食等待窗口时间：" layout_weight="20" />
                  <input id="windowTimeInpt" inputType="number" textSize="14sp" layout_weight="80" />
                </horizontal>
                <text text="循环检测等待时间是驱赶野鸡的轮询间隔，不建议设置太低" textSize="8sp" />
                <horizontal padding="10 0" gravity="center">
                  <text text="循环检测等待时间：" layout_weight="20" />
                  <input id="recheckTimeInpt" inputType="number" textSize="14sp" layout_weight="80" />
                </horizontal>
                <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                {/* 自动锁屏 */}
                <vertical id="lockDescNoRoot">
                  <text text="锁屏功能仅限于下拉状态栏中有锁屏按钮的情况下可用" textSize="12sp" />
                  <text text="实在想用可以自行修改Automator中的lockScreen方法" textSize="12sp" />
                </vertical>
                <horizontal gravity="center">
                  <checkbox id="autoLockChkBox" text="是否自动锁屏" />
                  <vertical padding="10 0" id="lockPositionContainer" gravity="center" layout_weight="75">
                    <horizontal margin="10 0" gravity="center">
                      <text text="x:" />
                      <seekbar id="lockXSeekBar" progress="20" layout_weight="80" />
                      <text id="lockX" />
                    </horizontal>
                    <horizontal margin="10 0" gravity="center">
                      <text text="y:" />
                      <seekbar id="lockYSeekBar" progress="20" layout_weight="80" />
                      <text id="lockY" />
                    </horizontal>
                    <button id="showLockPointConfig" >手动输入坐标</button>
                  </vertical>
                </horizontal>
                {/* 是否锁屏启动关闭弹框提示 */}
                <checkbox id="dismissDialogIfLockedChkBox" text="锁屏启动关闭弹框提示" />
                <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                {/* 是否显示debug日志 */}
                <checkbox id="showDebugLogChkBox" text="是否显示debug日志" />
                <checkbox id="showEngineIdChkBox" text="是否在控制台中显示脚本引擎id" />
                <checkbox id="developModeChkBox" text="是否启用开发模式" />
                <checkbox id="saveLogFileChkBox" text="是否保存日志到文件" />
                <horizontal padding="10 0" gravity="center">
                  <text text="星星球目标分数：" layout_weight="20" />
                  <input id="starBallScoreInpt" inputType="number" textSize="14sp" layout_weight="80" />
                </horizontal>
                <text text="刘海屏或者挖孔屏悬浮窗显示位置和实际目测位置不同，需要施加一个偏移量一般是负值，脚本运行时会自动设置：" textSize="12sp" margin="10 5"/>
                  <horizontal padding="10 10" gravity="center">
                    <text text="当前自动设置的刘海偏移量为：" textSize="12sp" layout_weight="60" />
                    <text id="bangOffsetText" textSize="12sp" layout_weight="40" />
                  </horizontal>
                {/* 是否自动点击授权录屏权限 */}
                <checkbox id="requestCapturePermissionChkBox" text="是否需要自动授权截图权限" />
                <horizontal w="*" h="1sp" bg="#cccccc" margin="5 0"></horizontal>
                {/* 单脚本使用，无视多任务队列 */}
                <text text="当需要使用多个脚本时不要勾选（如同时使用我写的蚂蚁森林脚本），避免抢占前台" textSize="9sp" />
                <checkbox id="singleScriptChkBox" text="是否单脚本运行" />
                {/* 脚本延迟启动 */}
                <horizontal gravity="center">
                  <text text="延迟启动时间（秒）:" />
                  <input layout_weight="70" inputType="number" id="delayStartTimeInpt" layout_weight="70" />
                </horizontal>
                <text text="偶尔通过captureScreen获取截图需要等待很久，或者一直阻塞无法进行下一步操作，建议开启异步等待，然后设置截图等待时间(默认500ms,需自行调试找到合适自己设备的数值)。失败多次后脚本会自动重启，重新获取截图权限" textSize="10dp" />
                  <checkbox id="asyncWaitingCaptureChkBox" text="是否异步等待截图" />
                  <horizontal gravity="center" id="asyncWaitingCaptureContainer">
                    <text text="获取截图等待时间（ms）:" />
                    <input id="captureWaitingTimeInpt" inputType="number" layout_weight="60" />
                  </horizontal>
              </vertical>
            </ScrollView>
          </frame>
        </vertical>
      </drawer>
    )

    // 创建选项菜单(右上角)
    ui.emitter.on("create_options_menu", menu => {
      menu.add("全部重置为默认")
      menu.add("从配置文件导入")
      menu.add("导出到配置文件")
      menu.add("导入运行时数据")
      menu.add("导出运行时数据")
    })
    // 监听选项菜单点击
    ui.emitter.on("options_item_selected", (e, item) => {
      let local_config_path = files.cwd() + '/local_config.cfg'
      let runtime_store_path = files.cwd() + '/runtime_store.cfg'
      let aesKey = device.getAndroidId()
      switch (item.getTitle()) {
        case "全部重置为默认":
          confirm('确定要将所有配置重置为默认值吗？').then(ok => {
            if (ok) {
              Object.keys(default_config).forEach(key => {
                let defaultValue = default_config[key]
                config[key] = defaultValue
                storageConfig.put(key, defaultValue)
              })
              resetUiValues()
            }
          })
          break
        case "从配置文件导入":
          confirm('确定要从local_config.cfg中读取配置吗？').then(ok => {
            if (ok) {
              try {
                if (files.exists(local_config_path)) {
                  let refillConfigs = function (configStr) {
                    let local_config = JSON.parse(configStr)
                    Object.keys(default_config).forEach(key => {
                      let defaultValue = local_config[key]
                      if (typeof defaultValue === 'undefined') {
                        defaultValue = default_config[key]
                      }
                      config[key] = defaultValue
                      storageConfig.put(key, defaultValue)
                    })
                    resetUiValues()
                  }
                  let configStr = AesUtil.decrypt(files.read(local_config_path), aesKey)
                  if (!configStr) {
                    toastLog('local_config.cfg解密失败, 请尝试输入秘钥')
                    dialogs.rawInput('请输入秘钥，可通过device.getAndroidId()获取')
                      .then(key => {
                        if (key) {
                          key = key.trim()
                          configStr = AesUtil.decrypt(files.read(local_config_path), key)
                          if (configStr) {
                            refillConfigs(configStr)
                          } else {
                            toastLog('秘钥不正确，无法解析')
                          }
                        }
                      })
                  } else {
                    refillConfigs(configStr)
                  }
                } else {
                  toastLog('local_config.cfg不存在无法导入')
                }
              } catch (e) {
                toastLog(e)
              }
            }
          })
          break
        case "导出到配置文件":
          confirm('确定要将配置导出到local_config.cfg吗？此操作会覆盖已有的local_config数据').then(ok => {
            if (ok) {
              Object.keys(default_config).forEach(key => {
                console.verbose(key + ': ' + config[key])
              })
              try {
                let configString = AesUtil.encrypt(JSON.stringify(config), aesKey)
                files.write(local_config_path, configString)
                toastLog('配置信息导出成功，刷新目录即可，local_config.cfg内容已加密仅本机可用，除非告知秘钥')
              } catch (e) {
                toastLog(e)
              }

            }
          })
          break
        case "导出运行时数据":
          confirm('确定要将运行时数据导出到runtime_store.cfg吗？此操作会覆盖已有的数据').then(ok => {
            if (ok) {
              try {
                let runtimeStorageStr = AesUtil.encrypt(commonFunctions.exportRuntimeStorage(), aesKey)
                files.write(runtime_store_path, runtimeStorageStr)
              } catch (e) {
                toastLog(e)
              }
            }
          })
          break
        case "导入运行时数据":
          confirm('确定要将从runtime_store.cfg导入运行时数据吗？此操作会覆盖已有的数据').then(ok => {
            if (ok) {
              if (files.exists(runtime_store_path)) {
                let encrypt_content = files.read(runtime_store_path)
                let resetRuntimeStore = function (runtimeStorageStr) {
                  if (commonFunctions.importRuntimeStorage(runtimeStorageStr)) {
                    resetUiValues()
                    return true
                  }
                  toastLog('导入运行配置失败，无法读取正确信息')
                  return false
                }
                try {
                  let decrypt = AesUtil.decrypt(encrypt_content, aesKey)
                  if (!decrypt) {
                    toastLog('runtime_store.cfg解密失败, 请尝试输入秘钥')
                    dialogs.rawInput('请输入秘钥，可通过device.getAndroidId()获取')
                      .then(key => {
                        if (key) {
                          key = key.trim()
                          decrypt = AesUtil.decrypt(encrypt_content, key)
                          if (decrypt) {
                            resetRuntimeStore(decrypt)
                          } else {
                            toastLog('秘钥不正确，无法解析')
                          }
                        }
                      })
                  } else {
                    resetRuntimeStore(decrypt)
                  }
                } catch (e) {
                  toastLog(e)
                }
              } else {
                toastLog('配置信息不存在，无法导入')
              }
            }
          })
          break
      }
      e.consumed = true
    })
    activity.setSupportActionBar(ui.toolbar)

    if (config.device_height === 0 || config.device_width === 0) {
      inputDeviceSize().then(() => resetUiValues())
    } else {
      resetUiValues()
    }

    ui.changeDeviceSizeBtn.on('click', () => {
      inputDeviceSize().then(() => setDeviceSizeText())
    })


    ui.password.addTextChangedListener(
      TextWatcherBuilder(text => { config.password = text + '' })
    )


    ui.isAlipayLockedChkBox.on('click', () => {
      config.is_alipay_locked = ui.isAlipayLockedChkBox.isChecked()
      ui.alipayLockPasswordContainer.setVisibility(config.is_alipay_locked ? View.VISIBLE : View.GONE)
    })


    ui.useSpeedCardChkBox.on('click', () => {
      config.useSpeedCard = ui.useSpeedCardChkBox.isChecked()
    })

    ui.pickShitChkBox.on('click', () => {
      config.pick_shit = ui.pickShitChkBox.isChecked()
    })

    ui.alipayLockPasswordInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.alipay_lock_password = text + '' })
    )

    ui.colorThresholdSeekbar.on('touch', () => {
      let precent = ui.colorThresholdSeekbar.getProgress()
      let trueVal = parseInt(precent * 255 / 100)
      ui.colorThresholdInput.text('' + trueVal)
      config.color_offset = trueVal
    })

    ui.windowTimeInpt.addTextChangedListener(
      TextWatcherBuilder(text => {
        let val = parseInt(text)
        config.windowTime = val >= 0 ? val : 0
      })
    )
    ui.recheckTimeInpt.addTextChangedListener(
      TextWatcherBuilder(text => {
        let val = parseInt(text)
        config.recheckTime = val >= 0 ? val : 0
      })
    )
    ui.starBallScoreInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.starBallScore = parseInt(text) })
    )

    ui.captureWaitingTimeInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.capture_waiting_time = parseInt(text) })
    )

    ui.isAlipayLockedChkBox.on('click', () => {
      config.is_alipay_locked = ui.isAlipayLockedChkBox.isChecked()
      ui.alipayLockPasswordContainer.setVisibility(config.is_alipay_locked ? View.VISIBLE : View.GONE)
    })

    ui.showDebugLogChkBox.on('click', () => {
      config.show_debug_log = ui.showDebugLogChkBox.isChecked()
    })

    ui.showEngineIdChkBox.on('click', () => {
      config.show_engine_id = ui.showEngineIdChkBox.isChecked()
    })

    ui.developModeChkBox.on('click', () => {
      config.develop_mode = ui.developModeChkBox.isChecked()
    })

    ui.saveLogFileChkBox.on('click', () => {
      config.saveLogFile = ui.saveLogFileChkBox.isChecked()
    })

    ui.dismissDialogIfLockedChkBox.on('click', () => {
      config.dismiss_dialog_if_locked = ui.dismissDialogIfLockedChkBox.isChecked()
    })

    ui.requestCapturePermissionChkBox.on('click', () => {
      config.request_capture_permission = ui.requestCapturePermissionChkBox.isChecked()
    })

    ui.asyncWaitingCaptureChkBox.on('click', () => {
      config.async_waiting_capture = ui.asyncWaitingCaptureChkBox.isChecked()
      ui.asyncWaitingCaptureContainer.setVisibility(config.async_waiting_capture ? View.VISIBLE : View.GONE)
    })

    ui.autoLockChkBox.on('click', () => {
      let checked = ui.autoLockChkBox.isChecked()
      config.auto_lock = checked
      ui.lockPositionContainer.setVisibility(checked && !_hasRootPermission ? View.VISIBLE : View.INVISIBLE)
    })

    ui.lockXSeekBar.on('touch', () => {
      let precent = ui.lockXSeekBar.getProgress()
      let trueVal = parseInt(precent * config.device_width / 100)
      ui.lockX.text('' + trueVal)
      config.lock_x = trueVal
    })

    ui.lockYSeekBar.on('touch', () => {
      let precent = ui.lockYSeekBar.getProgress()
      let trueVal = parseInt(precent * config.device_height / 100)
      ui.lockY.text('' + trueVal)
      config.lock_y = trueVal
    })

    ui.showLockPointConfig.on('click', () => {
      Promise.resolve().then(() => {
        return dialogs.rawInput('请输入X坐标：', config.lock_x + '')
      }).then(x => {
        if (x) {
          let xVal = parseInt(x)
          if (isFinite(xVal)) {
            config.lock_x = xVal
          } else {
            toast('输入值无效')
          }
        }
      }).then(() => {
        return dialogs.rawInput('请输入Y坐标：', config.lock_y + '')
      }).then(y => {
        if (y) {
          let yVal = parseInt(y)
          if (isFinite(yVal)) {
            config.lock_y = yVal
          } else {
            toast('输入值无效')
          }
        }
      }).then(() => {
        ui.lockX.text(config.lock_x + '')
        ui.lockXSeekBar.setProgress(parseInt(config.lock_x / config.device_width * 100))
        ui.lockY.text(config.lock_y + '')
        ui.lockYSeekBar.setProgress(parseInt(config.lock_y / config.device_height * 100))
      })
    })


    ui.singleScriptChkBox.on('click', () => {
      config.single_script = ui.singleScriptChkBox.isChecked()
    })

    ui.delayStartTimeInpt.addTextChangedListener(
      TextWatcherBuilder(text => { config.delayStartTime = parseInt(text) })
    )
    setTimeout(() => {
      loadingDialog.dismiss()
    }, 500)
  }, 400)

  ui.emitter.on('pause', () => {
    Object.keys(default_config).forEach(key => {
      let newVal = config[key]
      if (typeof newVal !== 'undefined') {
        storageConfig.put(key, newVal)
      } else {
        storageConfig.put(key, default_config[key])
      }
    })
    log('修改后配置信息：' + JSON.stringify(config))
  })
}