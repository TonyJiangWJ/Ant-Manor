/*
 * @Author: TonyJiangWJ
 * @Date: 2019-11-27 09:03:57
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2023-04-11 10:00:44
 * @Description: 
 */
require('./lib/Runtimes.js')(global)
let currentEngine = engines.myEngine().getSource() + ''
let isRunningMode = currentEngine.endsWith('/config.js') && typeof module === 'undefined'
let is_pro = !!Object.prototype.toString.call(com.stardust.autojs.core.timing.TimedTask.Companion).match(/Java(Class|Object)/)

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
  // 是否保存日志文件，如果设置为保存，则日志文件会按时间分片备份在logback/文件夹下
  save_log_file: true,
  // 日志保留天数
  log_saved_days: 3,
  // 异步写入日志文件
  async_save_log_file: true,
  back_size: '100',
  enable_call_state_control: false,
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
  // 佛系模式
  buddha_like_mode: false,
  // 多设备可信登录
  multi_device_login: false,
  // 单脚本模式 是否只运行一个脚本 不会同时使用其他的 开启单脚本模式 会取消任务队列的功能。
  // 比如同时使用其他脚本 则保持默认 false 否则设置为true 无视其他运行中的脚本
  single_script: false,
  auto_restart_when_crashed: true,
  // 延迟启动时延 5秒 悬浮窗中进行的倒计时时间
  delayStartTime: 5,
  // 是否是AutoJS Pro  需要屏蔽部分功能，暂时无法实现：生命周期监听等 包括通话监听
  is_pro: is_pro,
  // 是否捡屎
  pick_shit: false,
  request_capture_permission: true,
  capture_permission_button: 'START NOW|立即开始|允许',
  auto_set_bang_offset: true,
  bang_offset: 0,
  async_waiting_capture: true,
  capture_waiting_time: 500,
  // 本地ocr优先级
  local_ocr_priority: 'auto',
  apiKey: '0dGhhIf529lp1bB7vdH5vYFe',
  secretKey: 'Pk2M9CKcwsx0075Cslso0lUfIp8D5Lut',
  // 自动更新后需要强制执行的标记
  updated_temp_flag_1325: true,
  converted_custom_configs: false,
  thread_name_prefix: 'antmanor_',
  package_name: 'com.eg.android.AlipayGphone',
  check_device_posture: false,
  check_distance: false,
  posture_threshold_z: 6,
  // 电量保护，低于该值延迟60分钟执行脚本
  battery_keep_threshold: 20,
  // 锁屏启动时自动设置最低亮度
  auto_set_brightness: false,
  skip_running_packages: [],
  warn_skipped_ignore_package: false,
  warn_skipped_too_much: false,
  auto_check_update: false,
  not_lingering_float_window: true,
  github_url: 'https://github.com/TonyJiangWJ/Ant-Manor',
  // github release url 用于检测更新状态
  github_latest_url: 'https://api.github.com/repos/TonyJiangWJ/Ant-Manor/releases/latest',
  history_tag_url: 'https://api.github.com/repos/TonyJiangWJ/Ant-Manor/tags',
  feed_cycle_time: 300,
  speeded_feed_cycle_time: 240,
  other_accessisibility_services: '',
  // 小鸡睡觉配置
  to_sleep_entry: {
    x: 860,
    y: 1220
  },
  to_sleep_bed: {
    x: 200,
    y: 740
  },
  // 捐蛋按钮位置
  donate_egg: {
    x: 530,
    y: 2100
  },
  // 区域信息配置
  CHECK_APP_COLOR: '#f1381a',         // 校验蚂蚁庄园是否打开成功的颜色
  CHECK_FRIENDS_COLOR: '#fad082',     // 校验是否成功进入好友首页的颜色
  THIEF_COLOR: '#524c68',             // 校验小偷鸡眼罩的颜色 黑色
  PUNCH_COLOR: '#f35458',             // 校验拳头的颜色
  OUT_COLOR: '#c37a3e',               // 校验小鸡是否出门，牌子的颜色
  OUT_IN_FRIENDS_COLOR: '#e9ca02',    // 校验自家小鸡外出所在的颜色，ID的颜色 黄色
  DISMISS_COLOR: '#f9622f',           // 校验关闭按钮的颜色
  FOOD_COLOR: '#ffda33',              // 校验正在进食盆里饲料的颜色
  SPEED_CHECK_COLOR: '#f9d558',       // 校验是否成功使用加速卡，小鸡右手上饲料的颜色
  reco: [200, 1100, 750, 600],        // 星星球的判断区域

  OFFSET: 0,  // 默认配置为支持2160*1080分辨率，其他异形屏一般可以尝试仅仅修改该偏移量, 如果不行就修改具体区域的配置吧
  CHECK_APP_REGION: [352, 300, 20, 20],             // 校验是否成功打开蚂蚁庄园的区域，左上角❤️的区域
  CHECK_FRIENDS_REGION: [120, 472, 10, 10],         // 校验是否在好友首页的区域  左上角 发消息蓝色的区域
  OUT_REGION: [517, 1450, 25, 25],                  // 校验小鸡是否出门，牌子的区域
  OUT_IN_FRIENDS_REGION_RIGHT: [800, 1405, 50, 50], // 校验小鸡在好友家，左边的区域
  OUT_IN_FRIENDS_REGION_LEFT: [360, 1302, 50, 50],  // 校验小鸡在好友家，右边的区域
  LEFT_THIEF_REGION: [385, 1475, 50, 50],           // 校验来自家偷吃的小鸡，左边的区域
  LEFT_PUNCH_REGION: [500, 1300, 100, 100],         // 校验左边拳头的区域
  RIGHT_THIEF_REGION: [832, 1475, 50, 50],          // 校验来自家偷吃的小鸡，右边的区域
  RIGHT_PUNCH_REGION: [980, 1300, 100, 100],        // 校验右边拳头的区域
  DISMISS_REGION: [450, 2000, 50, 100],              // 校验关闭按钮的区域
  FOOD_REGION: [845, 1630, 10, 10],                 // 校验食盆的区域，主要校验是否存在饲料
  SPEED_CHECK_REGION: [480, 1420, 32, 43],          // 校验是否成功使用加速卡的区域，小鸡右手拿饲料的位置
  COUNT_DOWN_REGION: [780, 1540, 160, 60],          // 倒计时区域
  // 喂饲料按钮的位置
  FEED_POSITION: {
    x: 930,
    y: 2110
  },
  // 道具包按钮的位置
  TOOL_POSITION: {
    x: 960,
    y: 645
  },
  // 道具包中加速卡按钮的位置
  SPEED_CARD_POSITION: {
    x: 190,
    y: 1450
  },
  // 确认按钮的位置
  CONFIRM_POSITON: {
    x: 720,
    y: 1420
  },
  // 捡屎
  SHIT_CHECK_REGION: [660, 1875, 30, 20],
  COLLECT_SHIT_CHECK_REGION: [220, 1210, 80, 40],
  PICK_SHIT_GRAY_COLOR: '#111111',
  COLLECT_SHIT_GRAY_COLOR: '#535353',
  // 找图缓存
  // template_img_for_collect: '',
  // template_img_for_close_collect: ''
  // 标记是否清除webview缓存
  clear_webview_cache: false,
}

// 配置缓存的key值
let CONFIG_STORAGE_NAME = 'chick_config_version'
let PROJECT_NAME = '蚂蚁庄园'
var storageConfig = storages.create(CONFIG_STORAGE_NAME)
let securityFields = ['password', 'alipay_lock_password']
let AesUtil = require('./lib/AesUtil.js')
let aesKey = device.getAndroidId()
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
    let storedVal = storageConfig.get(key)
    if (typeof storedVal !== 'undefined') {
      if (securityFields.indexOf(key) > -1) {
        storedVal = AesUtil.decrypt(storedVal, aesKey) || storedVal
      }
      config[key] = storedVal
    } else {
      config[key] = default_config[key]
    }
  })
}
// 覆写配置信息
config.overwrite = (key, value) => {
  let storage_name = CONFIG_STORAGE_NAME
  let config_key = key
  if (key.indexOf('.') > -1) {
    let keyPair = key.split('.')
    storage_name = CONFIG_STORAGE_NAME + '_' + keyPair[0]
    key = keyPair[1]
    config_key = keyPair[0] + '_config'
    if (!config.hasOwnProperty(config_key) || !config[config_key].hasOwnProperty(key)) {
      return
    }
    config[config_key][key] = value
  } else {
    if (!config.hasOwnProperty(config_key)) {
      return
    }
    config[config_key] = value
  }
  console.verbose('覆写配置', storage_name, key)
  storages.create(storage_name).put(key, value)
}

// 扩展配置
let workpath = getCurrentWorkPath()
let configDataPath = workpath + '/config_data/'
// 蚂蚁新村识图配置
let default_village_config = {
  checking_mail_box: files.read(configDataPath + 'village/checking_mail_box.data'),
  empty_booth: files.read(configDataPath + 'village/empty_booth.data'),
  my_booth: files.read(configDataPath + 'village/my_booth.data'),
  speed_award: files.read(configDataPath + 'village/speed_award.data'),
  do_setup_booth: files.read(configDataPath + 'village/do_setup_booth.data'),
  friend_end_up_regex: '.*(已停产|余.*营.*)',
  booth_position_left: [193, 1659, 436, 376],
  booth_position_right: [629, 1527, 386, 282],
  booth_black_list: [],
  village_reward_click_x: 550,
  village_reward_click_y: 1180,
  interval_time: 120,
}
default_config.village_config = default_village_config
// 兼容旧版本
let tempConfig = convertDefaultData(default_village_config, CONFIG_STORAGE_NAME + '_viliage')
config.village_config = convertDefaultData(tempConfig, CONFIG_STORAGE_NAME + '_village')
// 领饲料配置
let default_fodder_config = {
  fodder_btn: files.read(configDataPath + 'fodder/fodder_btn.data'),
  close_interval: files.read(configDataPath + 'fodder/close_interval.data'),
  feed_package_full: '饲料袋.*满.*|知道了',
}
default_config.fodder_config = default_fodder_config
config.fodder_config = convertDefaultData(default_fodder_config, CONFIG_STORAGE_NAME + '_fodder')
config.code_version = 'v1.2.5.14'
if (!isRunningMode) {
  module.exports = function (__runtime__, scope) {
    if (typeof scope.config_instance === 'undefined') {
      scope.config_instance = {
        config: config,
        default_config: default_config,
        storage_name: CONFIG_STORAGE_NAME,
        securityFields: securityFields,
        project_name: PROJECT_NAME
      }
      events.broadcast.on(CONFIG_STORAGE_NAME + 'config_changed', function (params) {
        let newConfig = params.config
        let currentId = engines.myEngine().id
        let senderId = params.id
        if (currentId !== senderId) {
          console.verbose(currentId + ' 获取从' + senderId + '得到的新的配置信息' + JSON.stringify(newConfig))
          Object.assign(scope.config_instance.config, newConfig)
        }
      })
    }
    return scope.config_instance
  }

} else {
  setTimeout(function () {
    engines.execScriptFile(files.cwd() + "/可视化配置.js", { path: files.cwd() })
  }, 30)
}

function convertDefaultData(default_config, config_storage_name) {
  let config_storage = storages.create(config_storage_name)
  let configData = {}
  Object.keys(default_config).forEach(key => {
    let storageValue = config_storage.get(key, default_config[key])
    if (storageValue == '') {
      storageValue = default_config[key]
    }
    configData[key] = storageValue
  })
  return configData
}

function getCurrentWorkPath() {
  let currentPath = files.cwd()
  if (files.exists(currentPath + '/main.js')) {
    return currentPath
  }
  let paths = currentPath.split('/')

  do {
    paths = paths.slice(0, paths.length - 1)
    currentPath = paths.reduce((a, b) => a += '/' + b)
  } while (!files.exists(currentPath + '/main.js') && paths.length > 0)
  if (paths.length > 0) {
    return currentPath
  }
}
