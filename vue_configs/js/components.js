/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 13:16:53
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-18 16:16:58
 * @Description: 组件代码，传统方式，方便在手机上进行修改
 */

let mixin_methods = {
  data: function () {
    return {
      container: '.root-container'
    }
  },
  methods: {
    stopTouchmove: function (e) {
      e.stopPropagation()
    },
    isNotEmpty: function (v) {
      return !(typeof v === 'undefined' || v === null || v === '')
    },
    getContainer: function () {
      return document.querySelector(this.container)
    }
  },
  filters: {
    styleTextColor: function (v) {
      if (/^#[\dabcdef]{6}$/i.test(v)) {
        return { color: v }
      } else {
        return null
      }
    }
  }
}

let mixin_common = {
  mixins: [mixin_methods],
  data: function () {
    return {
      switchSize: '1.24rem',
      tipTextSize: '0.7rem',
      device: {
        width: 1080,
        height: 2340
      }
    }
  },
  methods: {
    loadConfigs: function () {
      $app.invoke('loadConfigs', {}, config => {
        Object.keys(this.configs).forEach(key => {
          // console.log('load config key:[' + key + '] value: [' + config[key] + ']')
          this.$set(this.configs, key, config[key])
        })
        this.device.width = config.device_width
        this.device.height = config.device_height
      })
    },
    doSaveConfigs: function (deleteFields) {
      console.log('执行保存配置')
      let newConfigs = {}
      Object.assign(newConfigs, this.configs)
      let errorFields = Object.keys(this.validationError)
      errorFields.forEach(key => {
        if (this.isNotEmpty(this.validationError[key])) {
          newConfigs[key] = ''
        }
      })
      if (deleteFields && deleteFields.length > 0) {
        deleteFields.forEach(key => {
          newConfigs[key] = ''
        })
      }
      $app.invoke('saveConfigs', newConfigs)
    }
  },
  computed: {
    validationError: function () {
      let errors = {}
      Object.keys(this.validations).forEach(key => {
        let { [key]: value } = this.configs
        let { [key]: validation } = this.validations
        if (this.isNotEmpty(value) && !validation.validate(value)) {
          errors[key] = validation.message(value)
        } else {
          errors[key] = ''
        }
      })
      return errors
    },
  },
  mounted () {
    this.loadConfigs()
  }
}


Vue.component('color-input-field', function (resolve, reject) {
  resolve({
    props: ['value', 'label', 'errorMessage', 'placeholder', 'labelWidth'],
    model: {
      prop: 'value',
      event: 'change'
    },
    mixins: [mixin_methods],
    data () {
      return {
        innerValue: this.value
      }
    },
    watch: {
      innerValue: function (v) {
        this.$emit('change', v)
      },
      value: function (v) {
        this.innerValue = v
      }
    },
    template: '<van-field \
      :label="label" input-align="right" :error-message="errorMessage" error-message-align="right" :label-width="labelWidth">\
      <input slot="input" v-model="innerValue" type="text" :placeholder="placeholder" class="van-field__control van-field__control--right" \
      :style="innerValue | styleTextColor" />\
    </van-field>'
  })
})

Vue.component('color-slider', function (resolve, reject) {
  resolve({
    mixins: [mixin_methods],
    props: ['value'],
    model: {
      prop: 'value',
      event: 'color-change'
    },
    data: function () {
      return {
        R: 0,
        G: 0,
        B: 0
      }
    },
    methods: {
      resolveDetailInfo: function () {
        if (/^#[\dabcdef]{6}$/i.test(this.value)) {
          let fullColorVal = parseInt(this.value.substring(1), 16)
          this.R = (fullColorVal >> 16) & 0xFF
          this.G = (fullColorVal >> 8) & 0xFF
          this.B = fullColorVal & 0xFF
        }
      }
    },
    computed: {
      colorText: function () {
        let colorStr = (this.R << 16 | this.G << 8 | this.B).toString(16)
        return '#' + new Array(7 - colorStr.length).join(0) + colorStr
      }
    },
    watch: {
      colorText: function (v) {
        this.$emit('color-change', v)
      },
      value: function (v) {
        this.resolveDetailInfo()
      }
    },
    mounted () {
      this.resolveDetailInfo()
    },
    template: '<div style="padding: 1rem 2rem;">\
      <van-row style="margin: 0.5rem 0">\
        <van-col><span class="simple-span" :style="colorText | styleTextColor">颜色值: {{colorText}}</span></van-col>\
      </van-row>\
      <van-row style="margin: 1.5rem 0 2rem 0">\
        <van-col :span="24">\
          <van-slider v-model="R" :min="0" :max="255" :active-color="\'#\' + R.toString(16) + \'0000\'">\
            <template #button>\
              <div class="custom-slide-button">R:{{ R }}</div>\
            </template>\
          </van-slider>\
        </van-col>\
      </van-row>\
      <van-row style="margin: 2rem 0">\
        <van-col :span="24">\
          <van-slider v-model="G" :min="0" :max="255" :active-color="\'#00\' + G.toString(16) + \'00\'">\
            <template #button>\
              <div class="custom-slide-button">G:{{ G }}</div>\
            </template>\
          </van-slider>\
        </van-col>\
      </van-row>\
      <van-row style="margin: 2rem 0">\
        <van-col :span="24">\
          <van-slider v-model="B" :min="0" :max="255" :active-color="\'#0000\' + B.toString(16)">\
            <template #button>\
              <div class="custom-slide-button">B:{{ B }}</div>\
            </template>\
          </van-slider>\
        </van-col>\
      </van-row>\
    </div>'
  })
})

Vue.component('swipe-color-input-field', function (resolve, reject) {
  resolve({
    mixins: [mixin_methods],
    props: ['value', 'label', 'errorMessage', 'placeholder', 'labelWidth'],
    model: {
      prop: 'value',
      event: 'change'
    },
    mixins: [mixin_methods],
    data () {
      return {
        innerValue: this.value,
        showColorSlider: false
      }
    },
    watch: {
      innerValue: function (v) {
        this.$emit('change', v)
      },
      value: function (v) {
        this.innerValue = v
      }
    },
    template: '<div>\
    <van-swipe-cell stop-propagation>\
      <color-input-field :error-message="errorMessage" v-model="innerValue" :label="label" :label-width="labelWidth" :placeholder="placeholder" />\
      <template #right>\
        <van-button square type="primary" text="滑动输入" @click="showColorSlider=true" />\
      </template>\
    </van-swipe-cell>\
    <van-popup v-model="showColorSlider" position="bottom" :style="{ height: \'30%\' }" :get-container="getContainer">\
      <color-slider v-model="innerValue"/>\
    </van-popup>\
    </div>'
  })
})

Vue.component('sample-configs', function (resolve, reject) {
  resolve({
    mixins: [mixin_common],
    data: function () {
      return {
        configs: {
          password: '',
          is_alipay_locked: false,
          alipay_lock_password: '',
          bang_offset: -90,
          auto_set_bang_offset: false,
          min_floaty_color: '',
          min_floaty_text_size: '',
          min_floaty_x: '',
          min_floaty_y: '',
          not_lingering_float_window: false,
          show_debug_log: false,
          show_engine_id: false,
          save_log_file: false,
          back_size: '',
          async_save_log_file: false,
          help_friend: false,
          is_cycle: false,
          cycle_times: 10,
          never_stop: false,
          reactive_time: 60,
          max_collect_wait_time: 60,
          delayStartTime: 5,
          request_capture_permission: true,
          enable_call_state_control: false,
          auto_set_brightness: false,
          dismiss_dialog_if_locked: true,
          check_device_posture: false,
          check_distance: false,
          posture_threshold_z: 6,
          auto_lock: false,
          hasRootPermission: false,
          lock_x: 150,
          lock_y: 970,
          timeout_unlock: 1000,
          timeout_findOne: 1000,
          timeout_existing: 8000,
          async_waiting_capture: true,
          capture_waiting_time: 500,
          develop_mode: false,
          develop_saving_mode: false,
          cutAndSaveCountdown: false,
          cutAndSaveTreeCollect: false,
          saveBase64ImgInfo: false
        },
        device: {
          pos_x: 0,
          pos_y: 0,
          pos_z: 0,
          distance: 0
        },
        validations: {
          min_floaty_color: {
            validate: (v) => /^#[\dabcdef]{6}$/i.test(v),
            message: () => '颜色值格式不正确'
          },
          posture_threshold_z: {
            validate: v => {
              if (v === undefined || v === '') {
                return true
              }
              let value = parseInt(v)
              return value > 0 && value < 9
            },
            message: () => '请输入一个介于0-9的数字，推荐4-7之间'
          },
          reactive_time: {
            validate: () => false,
            message: v => {
              if (v) {
                let reactiveTime = this.configs.reactive_time
                let rangeCheckRegex = /^(\d+)-(\d+)$/
                if (isNaN(reactiveTime)) {
                  if (rangeCheckRegex.test(this.configs.reactive_time)) {
                    let execResult = rangeCheckRegex.exec(this.configs.reactive_time)
                    let start = parseInt(execResult[1])
                    let end = parseInt(execResult[2])
                    if (start > end || start <= 0) {
                      return '随机范围应当大于零，且 start < end'
                    }
                  } else {
                    return '随机范围请按此格式输入: 5-10'
                  }
                } else {
                  if (parseInt(reactiveTime) <= 0) {
                    return '请输入一个正整数'
                  }
                }
              }
              return ''
            }
          }
        }
      }
    },
    methods: {
      saveConfigs: function () {
        console.log('save basic configs')
        if (this.configs.min_floaty_color && this.computedFloatyTextColor === '') {
          this.configs.min_floaty_color = ''
        }
        this.doSaveConfigs()
      },
      gravitySensorChange: function (data) {
        this.device.pos_x = data.x
        this.device.pos_y = data.y
        this.device.pos_z = data.z
      },
      distanceSensorChange: function (data) {
        this.device.distance = data.distance
      }
    },
    computed: {
      computedFloatyTextColor: function () {
        if (/#[\dabcdef]{6}/i.test(this.configs.min_floaty_color)) {
          return this.configs.min_floaty_color
        } else {
          return ''
        }
      },
      reactiveTimeDisplay: function () {
        if (this.configs.reactive_time) {
          let rangeCheckRegex = /^(\d+)-(\d+)$/
          if (isNaN(this.configs.reactive_time)) {
            if (rangeCheckRegex.test(this.configs.reactive_time)) {
              let execResult = rangeCheckRegex.exec(this.configs.reactive_time)
              let start = parseInt(execResult[1])
              let end = parseInt(execResult[2])
              if (start < end && start > 0) {
                return '当前设置为从 ' + start + ' 到 ' + end + ' 分钟的随机范围'
              }
            }
          } else {
            return '当前设置为' + this.configs.reactive_time + '分钟'
          }
        }
        return ''
      }
    },
    filters: {
      toFixed3: function (v) {
        if (v) {
          return v.toFixed(3)
        }
        return v
      }
    },
    mounted () {
      $app.registerFunction('saveBasicConfigs', this.saveConfigs)
      $app.registerFunction('gravitySensorChange', this.gravitySensorChange)
      $app.registerFunction('distanceSensorChange', this.distanceSensorChange)
      $app.registerFunction('reloadBasicConfigs', this.loadConfigs)
    },
    template: '<div>\
      <van-divider content-position="left">锁屏相关</van-divider>\
      <van-cell-group>\
        <van-field v-model="configs.password" label="锁屏密码" type="password" placeholder="请输入锁屏密码" input-align="right" />\
        <van-field v-model="configs.timeout_unlock" label="解锁超时时间" type="number" placeholder="请输入解锁超时时间" input-align="right">\
          <span slot="right-icon">毫秒</span>\
        </van-field>\
        <van-cell center title="支付宝是否锁定">\
          <van-switch v-model="configs.is_alipay_locked" :size="switchSize" />\
        </van-cell>\
        <van-field v-if="configs.is_alipay_locked" v-model="configs.alipay_lock_password" label="手势密码" placeholder="请输入手势密码对应的九宫格数字" type="password" input-align="right" />\
        <van-cell center title="锁屏启动设置最低亮度">\
          <van-switch v-model="configs.auto_set_brightness" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="锁屏启动关闭弹窗提示">\
          <van-switch v-model="configs.dismiss_dialog_if_locked" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="锁屏启动时检测设备传感器" label="检测是否在裤兜内，防止误触" >\
          <van-switch v-model="configs.check_device_posture" :size="switchSize" />\
        </van-cell>\
        <template  v-if="configs.check_device_posture">\
          <van-cell center title="同时校验距离传感器" label="部分设备数值不准默认关闭" >\
            <van-switch v-model="configs.check_distance" :size="switchSize" />\
          </van-cell>\
          <van-row>\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">z轴重力加速度阈值（绝对值小于该值时判定为在兜里）</span>\
            </van-col>\
          </van-row>\
          <van-row>\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">x: {{device.pos_x | toFixed3}} y: {{device.pos_y | toFixed3}} z: {{device.pos_z | toFixed3}} 距离传感器：{{device.distance}}</span>\
            </van-col>\
          </van-row>\
          <van-field v-if="configs.check_device_posture" v-model="configs.posture_threshold_z" error-message-align="right" :error-message="validationError.posture_threshold_z" label="加速度阈值" type="number" placeholder="请输入加速度阈值" input-align="right" />\
        </template>\
        <van-cell center title="自动锁屏" label="脚本执行完毕后自动锁定屏幕">\
          <van-switch v-model="configs.auto_lock" :size="switchSize" />\
        </van-cell>\
        <template v-if="configs.auto_lock && !configs.hasRootPermission">\
          <van-row>\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">自动锁屏功能默认仅支持MIUI12，其他系统需要自行扩展实现：extends/LockScreen.js</span>\
            </van-col>\
          </van-row>\
          <van-field v-model="configs.lock_x" label="横坐标位置" type="number" placeholder="请输入横坐标位置" input-align="right" />\
          <van-field v-model="configs.lock_y" label="纵坐标位置" type="number" placeholder="请输入纵坐标位置" input-align="right" />\
        </template>\
      </van-cell-group>\
      <van-divider content-position="left">悬浮窗配置</van-divider>\
      <van-cell-group>\
        <swipe-color-input-field label="悬浮窗颜色" :error-message="validationError.min_floaty_color" v-model="configs.min_floaty_color"\
          placeholder="悬浮窗颜色值 #FFFFFF" />\
        <van-field v-model="configs.min_floaty_text_size" label-width="8em" label="悬浮窗字体大小" placeholder="请输入悬浮窗字体大小" type="number" input-align="right">\
          <span slot="right-icon">sp</span>\
        </van-field>\
        <van-field v-model="configs.min_floaty_x" label="悬浮窗位置X" type="number" placeholder="请输入悬浮窗横坐标位置" input-align="right" />\
        <van-field v-model="configs.min_floaty_y" label="悬浮窗位置Y" type="number" placeholder="请输入悬浮窗纵坐标位置" input-align="right" />\
        <van-row>\
          <van-col :span="22" :offset="1">\
            <span :style="\'color: gray;font-size: \' + tipTextSize">刘海屏或者挖孔屏悬浮窗显示位置和实际目测位置不同，需要施加一个偏移量，一般是负值，脚本运行时会自动设置</span>\
          </van-col>\
        </van-row>\
        <van-cell center title="下次执行时重新识别">\
          <van-switch v-model="configs.auto_set_bang_offset" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="当前偏移量">\
          <span>{{configs.auto_set_bang_offset ? "下次执行时重新识别": configs.bang_offset}}</span>\
        </van-cell>\
        <van-cell center title="不驻留前台" label="是否在脚本执行完成后不驻留前台，关闭倒计时悬浮窗" title-style="flex:3;">\
          <van-switch v-model="configs.not_lingering_float_window" :size="switchSize" />\
        </van-cell>\
      </van-cell-group>\
      <van-divider content-position="left">收集配置</van-divider>\
      <van-cell-group>\
        <van-cell center title="是否帮助收取">\
          <van-switch v-model="configs.help_friend" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="是否循环">\
          <van-switch v-model="configs.is_cycle" :size="switchSize" />\
        </van-cell>\
        <van-field v-if="configs.is_cycle" v-model="configs.cycle_times" label="循环次数" type="number" placeholder="请输入单次运行循环次数" input-align="right" />\
        <van-cell center v-if="!configs.is_cycle" title="是否永不停止">\
          <van-switch v-model="configs.never_stop" :size="switchSize" />\
        </van-cell>\
        <template  v-if="configs.never_stop">\
          <van-row>\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">永不停止模式请不要全天24小时运行，具体见README</span>\
            </van-col>\
          </van-row>\
          <van-row>\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">重新激活时间可以选择随机范围，按如下格式输入即可：30-40。{{reactiveTimeDisplay}}</span>\
            </van-col>\
          </van-row>\
          <van-field v-model="configs.reactive_time" :error-message="validationError.reactive_time" error-message-align="right" label="重新激活时间" type="text" placeholder="请输入永不停止的循环间隔" input-align="right" >\
            <span slot="right-icon">分</span>\
          </van-field>\
        </template>\
        <van-field v-if="!configs.never_stop && !configs.is_cycle" v-model="configs.max_collect_wait_time" label="计时模式最大等待时间" label-width="10em" type="number" placeholder="请输入最大等待时间" input-align="right" >\
          <span slot="right-icon">分</span>\
        </van-field>\
        <van-field v-model="configs.delayStartTime" label="延迟启动时间" label-width="10em" type="number" placeholder="请输入延迟启动时间" input-align="right" >\
          <span slot="right-icon">秒</span>\
        </van-field>\
        <van-cell center title="是否自动授权截图权限">\
          <van-switch v-model="configs.request_capture_permission" :size="switchSize" />\
        </van-cell>\
        <van-row>\
          <van-col :span="22" :offset="1">\
            <span :style="\'color: gray;font-size: \' + tipTextSize">偶尔通过captureScreen获取截图需要等待很久，或者一直阻塞无法进行下一步操作，建议开启异步等待，然后设置截图等待时间(默认500ms,需自行调试找到合适自己设备的数值)。失败多次后脚本会自动重启，重新获取截图权限</span>\
          </van-col>\
        </van-row>\
        <van-cell center title="是否异步等待截图">\
          <van-switch v-model="configs.async_waiting_capture" :size="switchSize" />\
        </van-cell>\
        <van-field v-if="configs.async_waiting_capture" v-model="configs.capture_waiting_time" label="获取截图超时时间" label-width="8em" type="number" placeholder="请输入超时时间" input-align="right" >\
          <span slot="right-icon">毫秒</span>\
        </van-field>\
        <van-cell center title="是否通话时暂停脚本" title-style="width: 10em;flex:2;" label="需要授权AutoJS获取通话状态，Pro版暂时无法使用" >\
          <van-switch v-model="configs.enable_call_state_control" :size="switchSize" />\
        </van-cell>\
        <van-field v-model="configs.timeout_findOne" label="查找控件超时时间" label-width="8em" type="number" placeholder="请输入超时时间" input-align="right">\
          <span slot="right-icon">毫秒</span>\
        </van-field>\
        <van-field v-model="configs.timeout_existing" label="校验控件是否存在超时时间" label-width="12em" type="number" placeholder="请输入超时时间" input-align="right" >\
          <span slot="right-icon">毫秒</span>\
        </van-field>\
      </van-cell-group>\
      <van-divider content-position="left">日志配置</van-divider>\
      <van-cell-group>\
        <van-cell center title="是否显示debug日志">\
          <van-switch v-model="configs.show_debug_log" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="是否显示脚本引擎id">\
          <van-switch v-model="configs.show_engine_id" :size="switchSize" />\
        </van-cell>\
        <van-cell center title="是否保存日志到文件">\
          <van-switch v-model="configs.save_log_file" :size="switchSize" />\
        </van-cell>\
        <van-field v-if="configs.save_log_file" v-model="configs.back_size" label="日志文件滚动大小" label-width="8em" type="number" placeholder="请输入单个文件最大大小" input-align="right" >\
          <span slot="right-icon">KB</span>\
        </van-field>\
        <van-cell v-if="configs.save_log_file" center title="是否异步保存日志到文件">\
          <van-switch v-model="configs.async_save_log_file" :size="switchSize" />\
        </van-cell>\
      </van-cell-group>\
      <van-divider content-position="left">开发模式配置</van-divider>\
      <van-cell-group>\
        <van-cell center title="是否启用开发模式">\
          <van-switch v-model="configs.develop_mode" :size="switchSize" />\
        </van-cell>\
        <template v-if="configs.develop_mode">\
          <van-row>\
            <van-col :span="22" :offset="1">\
              <span :style="\'color: gray;font-size: \' + tipTextSize">脚本执行时保存图片等数据，未启用开发模式时依旧有效，请不要随意开启</span>\
            </van-col>\
          </van-row>\
          <van-cell center title="是否保存倒计时图片">\
            <van-switch v-model="configs.cutAndSaveCountdown" :size="switchSize" />\
          </van-cell>\
          <van-cell center title="是否保存可收取能量球图片">\
            <van-switch v-model="configs.cutAndSaveTreeCollect" :size="switchSize" />\
          </van-cell>\
          <van-cell center title="是否保存一些开发用的数据">\
            <van-switch v-model="configs.develop_saving_mode" :size="switchSize" />\
          </van-cell>\
          <van-cell center title="是否倒计时图片base64">\
            <van-switch v-model="configs.saveBase64ImgInfo" :size="switchSize" />\
          </van-cell>\
        </template>\
      </van-cell-group>\
    </div>'
  })
})

Vue.component('region-slider', function (resolve, reject) {
  resolve({
    mixins: [mixin_methods],
    props: ['device_height', 'device_width', 'max_height', 'max_width', 'value'],
    model: {
      prop: 'value',
      event: 'region-change'
    },
    data: function () {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      }
    },
    methods: {
      resolveDetailInfo: function () {
        if (/^(\d+)\s*,(\d+)\s*,(\d+)\s*,(\d+)\s*$/.test(this.value)) {
          let match = /^(\d+)\s*,(\d+)\s*,(\d+)\s*,(\d+)\s*$/.exec(this.value)
          this.x = parseInt(match[1])
          this.y = parseInt(match[2])
          this.width = parseInt(match[3])
          this.height = parseInt(match[4])
        }
      }
    },
    computed: {
      regionText: function () {
        return this.x + ',' + this.y + ',' + this.width + ',' + this.height
      }
    },
    watch: {
      regionText: function (v) {
        this.$emit('region-change', v)
      },
      value: function (v) {
        this.resolveDetailInfo()
      }
    },
    mounted () {
      this.resolveDetailInfo()
    },
    template: '<div style="padding: 1rem 2rem;">\
      <van-row style="margin: 0.5rem 0">\
        <van-col><span class="simple-span">区域数据: {{x}},{{y}},{{width}},{{height}}</span></van-col>\
      </van-row>\
      <van-row style="margin: 1.5rem 0 2rem 0">\
        <van-col :span="24">\
          <van-slider v-model="x" :min="0" :max="device_width" >\
            <template #button>\
              <div class="custom-slide-button">x:{{ x }}</div>\
            </template>\
          </van-slider>\
        </van-col>\
      </van-row>\
      <van-row style="margin: 2rem 0">\
        <van-col :span="24">\
          <van-slider v-model="y" :min="0" :max="device_height" >\
            <template #button>\
              <div class="custom-slide-button">y:{{ y }}</div>\
            </template>\
          </van-slider>\
        </van-col>\
      </van-row>\
      <van-row style="margin: 2rem 0">\
        <van-col :span="24">\
          <van-slider v-model="width" :min="0" :max="max_width||device_width" >\
            <template #button>\
              <div class="custom-slide-button">w:{{ width }}</div>\
            </template>\
          </van-slider>\
        </van-col>\
      </van-row>\
      <van-row style="margin: 2rem 0">\
        <van-col :span="24">\
          <van-slider v-model="height" :min="0" :max="max_height||device_height" >\
            <template #button>\
              <div class="custom-slide-button">h:{{ height }}</div>\
            </template>\
          </van-slider>\
        </van-col>\
      </van-row>\
    </div>'
  })
})

Vue.component('region-input-field', function (resolve, reject) {
  resolve({
    mixins: [mixin_methods],
    props: ['value', 'label', 'labelWidth', "deviceWidth", "deviceHeight", "errorMessage",],
    model: {
      prop: 'value',
      event: 'change'
    },
    data: function () {
      return {
        innerValue: this.value,
        showRegionSlider: false,
      }
    },
    watch: {
      innerValue: function (v) {
        this.$emit('change', v)
      },
      value: function (v) {
        this.innerValue = v
      }
    },
    template: '<div>\
      <van-swipe-cell stop-propagation>\
        <van-field :error-message="errorMessage" error-message-align="right" v-model="innerValue" :label="label" :label-width="labelWidth" type="text" placeholder="请输入校验区域" input-align="right" />\
        <template #right>\
          <van-button square type="primary" text="滑动输入" @click="showRegionSlider=true" />\
        </template>\
      </van-swipe-cell>\
      <van-popup v-model="showRegionSlider" position="bottom" :style="{ height: \'30%\' }" :get-container="getContainer">\
        <region-slider :device_width="deviceWidth" :device_height="deviceHeight" v-model="innerValue"/>\
      </van-popup>\
    </div>'
  })
})


Vue.component('installed-package-selector', function (resolve, reject) {
  resolve({
    mixins: [mixin_methods],
    props: {
      addedPackageNames: {
        type: Array,
        default: () => []
      }
    },
    data () {
      return {
        installedPackages: [{ packageName: 'com.tony.test', appName: 'testApp' }],
        showPackageSelect: false,
        onLoading: true,
        canReadPackage: false,
        readPackages: null,
        searchString: ''
      }
    },
    methods: {
      doLoadInstalledPackages: function () {
        if (this.canReadPackage && this.readPackages !== null) {
          console.log('added pacakges: ' + JSON.stringify(this.addedPackageNames))
          console.log('all pacakges: ' + JSON.stringify(this.readPackages))
          this.installedPackages = this.readPackages.filter(v => this.addedPackageNames.indexOf(v.packageName) < 0)
        } else {
          this.installedPackages = []
        }
        this.onLoading = false
      },
      loadInstalledPackages: function () {
        this.showPackageSelect = true
        this.onLoading = true

        let self = this
        if (self.readPackages === null) {
          // 延迟加载 避免卡顿
          setTimeout(function () {
            $app.invoke('loadInstalledPackages', {}, data => {
              if (data && data.length > 0) {
                self.readPackages = data.sort((a, b) => {
                  if (String.prototype.localeCompare) {
                    return a.appName.localeCompare(b.appName)
                  } else {
                    if (a.appName > b.appName) {
                      return 1
                    } else if (a.appName === b.appName) {
                      return 0
                    } else {
                      return -1
                    }
                  }
                })
                self.canReadPackage = true
              } else {
                self.canReadPackage = false
              }
              self.doLoadInstalledPackages()
            })
          }, 350)
        } else {
          setTimeout(function () {
            self.doLoadInstalledPackages()
          }, 350)
        }
      },
      selectPackage: function (package) {
        this.$emit('value-change', package)
        this.showPackageSelect = false
      },
      doSearch: function (val) {
        this.searchString = val
      },
      cancelSearch: function () {
        this.searchString = ''
      }
    },
    computed: {
      filteredPackages: function () {
        if (this.isNotEmpty(this.searchString)) {
          return this.installedPackages.filter(package => package.appName.indexOf(this.searchString) > -1)
        } else {
          return this.installedPackages
        }
      }
    },
    template: '<div>\
      <van-row type="flex" justify="center">\
        <van-col>\
          新增应用白名单\
          <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="loadInstalledPackages">从已安装的列表中选择</van-button>\
        </van-col>\
      </van-row>\
      <van-popup v-model="showPackageSelect" position="bottom" :style="{ height: \'75%\' }" :get-container="getContainer">\
        <van-search v-model="searchString" show-action @search="doSearch" @cancel="cancelSearch" placeholder="请输入搜索关键词" />\
        <van-row v-if="onLoading || !installedPackages || installedPackages.length === 0" type="flex" justify="center" style="margin-top: 12rem;">\
          <van-col v-if="onLoading"><van-loading size="3rem" /></van-col>\
          <template v-else-if="!installedPackages || installedPackages.length === 0">\
            <van-col :style="{ margin: \'2rem\'}" v-if="!canReadPackage">无法读取应用列表，请确认是否给与了AutoJS读取应用列表的权限</van-col>\
            <van-col :style="{ margin: \'2rem\'}" v-else>已安装应用已经全部加入到白名单中了，你可真行</van-col>\
          </template>\
        </van-row>\
        <van-row v-else-if="filteredPackages.length === 0" type="flex" justify="center" style="margin-top: 12rem;">\
          <van-col :style="{ margin: \'2rem\'}">未找到匹配的应用</van-col>\
        </van-row>\
        <van-cell v-if="!onLoading" v-for="package in filteredPackages" :key="package.packageName" :title="package.appName" :label="package.packageName" @click="selectPackage(package)"></van-cell>\
      </van-popup>\
    </div>'
  })
})
