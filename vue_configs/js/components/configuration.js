/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 13:16:53
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2020-12-23 22:29:32
 * @Description: 组件代码，传统方式，方便在手机上进行修改
 */

/**
 * 基础配置
 */
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
          show_debug_log: false,
          show_engine_id: false,
          save_log_file: false,
          back_size: '',
          async_save_log_file: false,
          delayStartTime: 5,
          request_capture_permission: true,
          capture_permission_button: 'START NOW|立即开始|允许',
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
          enable_visual_helper: false,
          // 是否使用加速卡 默认为true
          useSpeedCard: true,
          pick_shit: true,
          starBallScore: 205,
          // 倒计时结束 等待的窗口时间
          windowTime: 5,
          recheckTime: 5,
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
        <number-field v-model="configs.timeout_unlock" label="解锁超时时间" placeholder="请输入解锁超时时间" >\
          <template #right-icon><span>毫秒</span></template>\
        </number-field>\
        <switch-cell title="支付宝是否锁定" v-model="configs.is_alipay_locked" />\
        <van-field v-if="configs.is_alipay_locked" v-model="configs.alipay_lock_password" label="手势密码" placeholder="请输入手势密码对应的九宫格数字" type="password" input-align="right" />\
        <switch-cell title="锁屏启动设置最低亮度" v-model="configs.auto_set_brightness" />\
        <switch-cell title="锁屏启动关闭弹窗提示" v-model="configs.dismiss_dialog_if_locked" />\
        <switch-cell title="锁屏启动时检测设备传感器" label="检测是否在裤兜内，防止误触" v-model="configs.check_device_posture" />\
        <template  v-if="configs.check_device_posture">\
          <switch-cell title="同时校验距离传感器" label="部分设备数值不准默认关闭" v-model="configs.check_distance" />\
          <tip-block>z轴重力加速度阈值（绝对值小于该值时判定为在兜里）</tip-block>\
          <tip-block>x: {{device.pos_x | toFixed3}} y: {{device.pos_y | toFixed3}} z: {{device.pos_z | toFixed3}} 距离传感器：{{device.distance}}</tip-block>\
          <number-field v-if="configs.check_device_posture" v-model="configs.posture_threshold_z" error-message-align="right" :error-message="validationError.posture_threshold_z" label="加速度阈值" placeholder="请输入加速度阈值" />\
        </template>\
        <switch-cell title="自动锁屏" label="脚本执行完毕后自动锁定屏幕" v-model="configs.auto_lock" />\
        <template v-if="configs.auto_lock && !configs.hasRootPermission">\
          <tip-block>自动锁屏功能默认仅支持MIUI12，其他系统需要自行扩展实现：extends/LockScreen.js</tip-block>\
          <number-field v-model="configs.lock_x" label="横坐标位置" placeholder="请输入横坐标位置" />\
          <number-field v-model="configs.lock_y" label="纵坐标位置" placeholder="请输入纵坐标位置" />\
        </template>\
      </van-cell-group>\
      <van-divider content-position="left">悬浮窗配置</van-divider>\
      <van-cell-group>\
        <tip-block>刘海屏或者挖孔屏悬浮窗显示位置和实际目测位置不同，需要施加一个偏移量，一般是负值，脚本运行时会自动设置</tip-block>\
        <switch-cell title="下次执行时重新识别" v-model="configs.auto_set_bang_offset" />\
        <van-cell center title="当前偏移量">\
          <span>{{configs.auto_set_bang_offset ? "下次执行时重新识别": configs.bang_offset}}</span>\
        </van-cell>\
      </van-cell-group>\
      <van-divider content-position="left">执行配置</van-divider>\
      <van-cell-group>\
        <number-field v-model="configs.delayStartTime" label="延迟启动时间" label-width="10em" placeholder="请输入延迟启动时间" >\
          <template #right-icon><span>秒</span></template>\
        </number-field>\
        <switch-cell title="是否使用加速卡" v-model="configs.useSpeedCard" />\
        <switch-cell title="是否捡屎" v-model="configs.pick_shit" />\
        <tip-block>脚本当前执行逻辑是，第一次喂食后等待20分钟，然后根据[循环检测等待时间]循环多次直到找到偷吃的野鸡或者达到40分钟后，\
          根据倒计时（通过OCR识别，识别失败通过程序计算大约值）重新创建定时任务，定时任务会往后延期[喂食等待窗口时间]</tip-block>\
        <tip-block>喂食等待窗口时间是为了避免倒计时计算不准确而加入的冗余时间，不建议设置成0</tip-block>\
        <number-field v-model="configs.windowTime" label="喂食等待窗口时间" label-width="10em" placeholder="请输入喂食等待窗口时间" >\
          <template #right-icon><span>分</span></template>\
        </number-field>\
        <tip-block>循环检测等待时间是驱赶野鸡的轮询间隔，不建议设置太低</tip-block>\
        <number-field v-model="configs.recheckTime" label="循环检测等待时间" label-width="10em" placeholder="请输入循环检测等待时间" >\
          <template #right-icon><span>分</span></template>\
        </number-field>\
        <number-field v-model="configs.starBallScore" label="星星球目标分数" label-width="10em" placeholder="请输入星星球目标分数" />\
        <switch-cell title="是否自动授权截图权限" v-model="configs.request_capture_permission" />\
        <van-field v-if="configs.request_capture_permission" v-model="configs.capture_permission_button" label="确定按钮文本" type="text" placeholder="请输入确定按钮文本" input-align="right" />\
        <tip-block>偶尔通过captureScreen获取截图需要等待很久，或者一直阻塞无法进行下一步操作，建议开启异步等待，然后设置截图等待时间(默认500ms,需自行调试找到合适自己设备的数值)。\
        失败多次后脚本会自动重启，重新获取截图权限</tip-block>\
        <switch-cell title="是否异步等待截图" v-model="configs.async_waiting_capture" />\
        <number-field v-if="configs.async_waiting_capture" v-model="configs.capture_waiting_time" label="获取截图超时时间" label-width="8em" placeholder="请输入超时时间" >\
          <template #right-icon><span>毫秒</span></template>\
        </number-field>\
        <switch-cell title="是否通话时暂停脚本" label="需要授权AutoJS获取通话状态，Pro版暂时无法使用" title-style="width: 10em;flex:2;" v-model="configs.enable_call_state_control" />\
        <number-field v-model="configs.timeout_findOne" label="查找控件超时时间" label-width="8em" placeholder="请输入超时时间" >\
          <template #right-icon><span>毫秒</span></template>\
        </number-field>\
        <number-field v-model="configs.timeout_existing" label="校验控件是否存在超时时间" label-width="12em" placeholder="请输入超时时间" >\
          <template #right-icon><span>毫秒</span></template>\
        </number-field>\
      </van-cell-group>\
      <van-divider content-position="left">日志配置</van-divider>\
      <van-cell-group>\
        <switch-cell title="是否显示debug日志" v-model="configs.show_debug_log" />\
        <switch-cell title="是否显示脚本引擎id" v-model="configs.show_engine_id" />\
        <switch-cell title="是否保存日志到文件" v-model="configs.save_log_file" />\
        <number-field v-if="configs.save_log_file" v-model="configs.back_size" label="日志文件滚动大小" label-width="8em" placeholder="请输入单个文件最大大小" >\
          <template #right-icon><span>KB</span></template>\
        </number-field>\
        <switch-cell title="是否异步保存日志到文件" v-model="configs.async_save_log_file" />\
      </van-cell-group>\
      <van-divider content-position="left">开发模式配置</van-divider>\
      <van-cell-group>\
        <switch-cell title="是否启用开发模式" v-model="configs.develop_mode" />\
        <template v-if="configs.develop_mode">\
          <tip-block>脚本执行时保存图片等数据，未启用开发模式时依旧有效，请不要随意开启</tip-block>\
          <switch-cell title="是否保存一些开发用的数据" v-model="configs.develop_saving_mode" />\
          <switch-cell title="是否启用可视化辅助工具" v-model="configs.enable_visual_helper" />\
        </template>\
      </van-cell-group>\
    </div>'
  })
})

/**
 * 进阶配置
 */
Vue.component('advance-configs', function (resolve, reject) {
  resolve({
    mixins: [mixin_common],
    data: function () {
      return {
        mounted: false,
        showAddSkipRunningDialog: false,
        newSkipRunningPackage: '',
        newSkipRunningAppName: '',
        configs: {
          single_script: false,
          skip_running_packages: [{ packageName: 'com.tony.test', appName: 'test' }, { packageName: 'com.tony.test2', appName: 'test2' }]
        },
        validations: {
        }
      }
    },
    methods: {
      loadConfigs: function () {
        $app.invoke('loadConfigs', {}, config => {
          Object.keys(this.configs).forEach(key => {
            console.log('child load config key:[' + key + '] value: [' + config[key] + ']')
            this.$set(this.configs, key, config[key])
          })
          if (this.configs.skip_running_packages && this.configs.skip_running_packages.length > 0) {
            if (!this.configs.skip_running_packages[0].packageName) {
              this.configs.skip_running_packages = []
            }
          }
          this.mounted = true
        })
      },
      saveConfigs: function () {
        console.log('save advnace configs')
        this.doSaveConfigs(['stroll_button_region', 'rank_check_region', 'bottom_check_region', 'tree_collect_region'])
      },
      addSkipPackage: function () {
        this.newSkipRunningPackage = ''
        this.newSkipRunningAppName = ''
        this.showAddSkipRunningDialog = true
      },
      doAddSkipPackage: function () {
        if (!this.isNotEmpty(this.newSkipRunningAppName)) {
          vant.Toast('请输入应用名称')
          return
        }
        if (!this.isNotEmpty(this.newSkipRunningPackage)) {
          vant.Toast('请输入应用包名')
          return
        }
        if (this.addedSkipPackageNames.indexOf(this.newSkipRunningPackage) < 0) {
          this.configs.skip_running_packages.push({ packageName: this.newSkipRunningPackage, appName: this.newSkipRunningAppName })
        }
      },
      deleteSkipPackage: function (idx) {
        this.$dialog.confirm({
          message: '确认要删除' + this.configs.skip_running_packages[idx].packageName + '吗？'
        }).then(() => {
          this.configs.skip_running_packages.splice(idx, 1)
        }).catch(() => { })
      },
      showRealVisual: function () {
        $app.invoke('showRealtimeVisualConfig', {})
      },
      handlePackageChange: function (payload) {
        this.newSkipRunningAppName = payload.appName
        this.newSkipRunningPackage = payload.packageName
      }
    },
    computed: {
      addedSkipPackageNames: function () {
        return this.configs.skip_running_packages.map(v => v.packageName)
      }
    },
    watch: {
    },
    mounted () {
      $app.registerFunction('saveAdvanceConfigs', this.saveConfigs)
      $app.registerFunction('reloadAdvanceConfigs', this.loadConfigs)
      // this.loadConfigs()
    },
    template: '<div style="min-height:700px;">\
      <van-cell-group>\
        <tip-block>当需要使用多个脚本时不要勾选（如同时使用我写的蚂蚁森林脚本），避免抢占前台</tip-block>\
        <switch-cell title="是否单脚本运行" v-model="configs.single_script" />\
      </van-cell-group>\
      <van-divider content-position="left">\
        前台应用白名单设置\
        <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="addSkipPackage">增加</van-button>\
      </van-divider>\
      <van-cell-group>\
        <div style="max-height:25rem;overflow:scroll;padding:1rem;background:#f1f1f1;">\
        <van-swipe-cell v-for="(skip,idx) in configs.skip_running_packages" :key="skip.packageName" stop-propagation>\
          <van-cell :title="skip.appName" :label="skip.packageName" />\
          <template #right>\
            <van-button square type="danger" text="删除" @click="deleteSkipPackage(idx)" style="height: 100%"/>\
          </template>\
        </van-swipe-cell>\
        </div>\
      </van-cell-group>\
      <van-dialog v-model="showAddSkipRunningDialog" show-cancel-button @confirm="doAddSkipPackage" :get-container="getContainer">\
        <template #title>\
          <installed-package-selector @value-change="handlePackageChange" :added-package-names="addedSkipPackageNames"/>\
        </template>\
        <van-field v-model="newSkipRunningAppName" placeholder="请输入应用名称" label="应用名称" />\
        <van-field v-model="newSkipRunningPackage" placeholder="请输入应用包名" label="应用包名" />\
      </van-dialog>\
    </div>'
  })
})


/**
 * 区域颜色等配置
 **/
Vue.component('color-region-configs', (resolve, reject) => {
  resolve({
    mixins: [mixin_common],
    data () {
      return {
        configs: {
          CHECK_APP_COLOR: '#f1381a',         // 校验蚂蚁庄园是否打开成功的颜色
          CHECK_FRIENDS_COLOR: '#429beb',     // 校验是否成功进入好友首页的颜色
          THIEF_COLOR: '#000000',             // 校验小偷鸡眼罩的颜色 黑色
          PUNCH_COLOR: '#f35458',             // 校验拳头的颜色
          OUT_COLOR: '#c37a3e',               // 校验小鸡是否出门，牌子的颜色
          OUT_IN_FRIENDS_COLOR: '#e9ca02',    // 校验自家小鸡外出所在的颜色，ID的颜色 黄色
          DISMISS_COLOR: '#f9622f',           // 校验关闭按钮的颜色
          FOOD_COLOR: '#ffcf00',              // 校验正在进食盆里饲料的颜色
          SPEED_CHECK_COLOR: '#ffd000',       // 校验是否成功使用加速卡，小鸡右手上饲料的颜色
          reco: [200, 1100, 750, 600],        // 星星球的判断区域

          OFFSET: 0,  // 默认配置为支持2340*1080分辨率，其他异形屏一般可以尝试仅仅修改该偏移量, 如果不行就修改具体区域的配置吧
          CHECK_APP_REGION: [310, 300, 20, 20],             // 校验是否成功打开蚂蚁庄园的区域，左上角❤️的区域
          CHECK_FRIENDS_REGION: [120, 500, 10, 10],         // 校验是否在好友首页的区域  左上角 发消息蓝色的区域
          OUT_REGION: [530, 1450, 25, 25],                  // 校验小鸡是否出门，牌子的区域
          OUT_IN_FRIENDS_REGION_LEFT: [340, 1405, 50, 50],  // 校验小鸡在好友家，左边的区域
          OUT_IN_FRIENDS_REGION_RIGHT: [800, 1405, 50, 50], // 校验小鸡在好友家，右边的区域
          LEFT_THIEF_REGION: [385, 1550, 50, 50],           // 校验来自家偷吃的小鸡，左边的区域
          LEFT_PUNCH_REGION: [500, 1375, 100, 100],         // 校验左边拳头的区域
          RIGHT_THIEF_REGION: [825, 1550, 50, 50],          // 校验来自家偷吃的小鸡，右边的区域
          RIGHT_PUNCH_REGION: [980, 1375, 100, 100],        // 校验右边拳头的区域
          DISMISS_REGION: [450, 2000, 50, 100],              // 校验关闭按钮的区域
          FOOD_REGION: [600, 1575, 10, 10],                 // 校验食盆的区域，主要校验是否存在饲料
          SPEED_CHECK_REGION: [500, 1575, 10, 10],          // 校验是否成功使用加速卡的区域，小鸡右手拿饲料的位置
          COUNT_DOWN_REGION: [810, 1600, 160, 55],          // 倒计时区域
          // 喂饲料按钮的位置
          FEED_POSITION: {
            x: 930,
            y: 2100
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
          SHIT_CHECK_REGION: [435, 1925, 40, 40],
          COLLECT_SHIT_CHECK_REGION: [220, 2000, 80, 40],
          PICK_SHIT_GRAY_COLOR: '#A6A6A6',
          COLLECT_SHIT_GRAY_COLOR: '#838383'
        }
      }
    },
    methods: {
      showRealVisual: function () {
        $app.invoke('showRealtimeVisualConfig', {})
      }
    },
    watch: {
      configs: {
        deep: true,
        handler: function (v) {
          this.doSaveConfigs()
        }
      }
    },
    mounted() {
      $app.registerFunction('saveColorRegionConfigs', this.doSaveConfigs)
      $app.registerFunction('reloadColorRegionConfigs', this.loadConfigs)
    },
    template: '<div>\
    <van-divider content-position="left">\
      校验区域配置\
      <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="showRealVisual">实时查看区域</van-button>\
    </van-divider>\
      <van-cell-group>\
        <color-input-field label="校验是否打开APP的颜色" label-width="12em" v-model="configs.CHECK_APP_COLOR"/>\
        <region-input-field :array-value="true" v-model="configs.CHECK_APP_REGION" label="校验是否打开APP的区域" label-width="12em" :max-width="100" :max-height="100" />\
        <color-input-field label="校验小鸡是否出门，牌子的颜色" label-width="14em" v-model="configs.OUT_COLOR"/>\
        <region-input-field :array-value="true" v-model="configs.OUT_REGION" label="校验小鸡是否出门，牌子的区域" label-width="14em" :max-width="100" :max-height="100" />\
        <color-input-field label="校验是否打开好友页面的颜色" label-width="14em" v-model="configs.CHECK_FRIENDS_COLOR"/>\
        <region-input-field :array-value="true" v-model="configs.CHECK_FRIENDS_REGION" label="校验是否打开好友页面的区域" label-width="14em" :max-width="100" :max-height="100" />\
        <color-input-field label="校验自家小鸡外出所在的颜色，ID的颜色" label-width="14em" v-model="configs.OUT_IN_FRIENDS_COLOR"/>\
        <region-input-field :array-value="true" v-model="configs.OUT_IN_FRIENDS_REGION_LEFT" label="校验小鸡在好友家，左边的区域" label-width="14em" :max-width="100" :max-height="100" />\
        <region-input-field :array-value="true" v-model="configs.OUT_IN_FRIENDS_REGION_RIGHT" label="校验小鸡在好友家，右边的区域" label-width="14em" :max-width="100" :max-height="100" />\
        <color-input-field label="校验小偷鸡眼罩的颜色" label-width="12em" v-model="configs.THIEF_COLOR"/>\
        <region-input-field :array-value="true" v-model="configs.LEFT_THIEF_REGION" label="校验来自家偷吃的小鸡，左边的区域" label-width="14em" :max-width="150" :max-height="150" />\
        <region-input-field :array-value="true" v-model="configs.RIGHT_THIEF_REGION" label="校验来自家偷吃的小鸡，右边的区域" label-width="14em" :max-width="150" :max-height="150" />\
        <color-input-field label="校验拳头的颜色" label-width="12em" v-model="configs.PUNCH_COLOR"/>\
        <region-input-field :array-value="true" v-model="configs.LEFT_PUNCH_REGION" label="校验左边拳头的区域" label-width="12em" :max-width="150" :max-height="150" />\
        <region-input-field :array-value="true" v-model="configs.RIGHT_PUNCH_REGION" label="校验右边拳头的区域" label-width="12em" :max-width="150" :max-height="150" />\
        <color-input-field label="校验正在进食盆里饲料的颜色" label-width="14em" v-model="configs.FOOD_COLOR"/>\
        <region-input-field :array-value="true" v-model="configs.FOOD_REGION" label="校验食盆的区域，主要校验是否存在饲料" label-width="14em" :max-width="50" :max-height="50" />\
        <color-input-field label="校验是否成功使用加速卡，小鸡右手上饲料的颜色" label-width="14em" v-model="configs.SPEED_CHECK_COLOR"/>\
        <region-input-field :array-value="true" v-model="configs.SPEED_CHECK_REGION" label="校验是否成功使用加速卡的区域，小鸡右手拿饲料的位置" label-width="14em" :max-width="50" :max-height="50" />\
        <color-input-field label="校验关闭按钮的颜色" label-width="12em" v-model="configs.DISMISS_COLOR"/>\
        <region-input-field :array-value="true" v-model="configs.DISMISS_REGION" label="校验关闭按钮的区域" label-width="12em" :max-width="100" :max-height="100" />\
        <region-input-field :array-value="true" v-model="configs.COUNT_DOWN_REGION" label="OCR校验倒计时的区域，需要精确框选" label-width="14em" :max-width="300" :max-height="100" />\
        <color-input-field label="校验是否可以捡屎灰度颜色值" label-width="14em" v-model="configs.PICK_SHIT_GRAY_COLOR"/>\
        <region-input-field :array-value="true" v-model="configs.SHIT_CHECK_REGION" label="校验是否可以捡屎的区域" label-width="12em" :max-width="100" :max-height="100" />\
        <color-input-field label="校验执行捡屎的灰度颜色值" label-width="14em" v-model="configs.COLLECT_SHIT_GRAY_COLOR"/>\
        <region-input-field :array-value="true" v-model="configs.COLLECT_SHIT_CHECK_REGION" label="校验执行捡屎的区域" label-width="12em" />\
        <region-input-field :array-value="true" v-model="configs.reco" label="星星球识别区域" label-width="12em" />\
        <position-input-field v-model="configs.FEED_POSITION" label="喂食饲料的位置" label-width="12em" />\
        <position-input-field v-model="configs.TOOL_POSITION" label="道具包按钮的位置" label-width="12em" />\
        <position-input-field v-model="configs.SPEED_CARD_POSITION" label="加速卡按钮的位置" label-width="12em" />\
        <position-input-field v-model="configs.CONFIRM_POSITON" label="确认按钮的位置" label-width="12em" />\
      </van-cell-group>\
    </div>'
  })
})
