
/**
 * 开发模式
 */
 const DevelopConfig = {
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        develop_mode: true,
        develop_saving_mode: true,
        save_yolo_train_data: true,
        enable_visual_helper: true,
        auto_check_update: true,
        clear_webview_cache: true,
        yolo_save_list: [
          // 网页调试时使用，AutoJS运行时读取config.js中的配置 后续可以不去修改
          ['check_failed', 'YOLO识别失败'],
          ['low_predict', '低可信度'],
          ['friend_home_yolo_failed', '好友界面失败'],
          ['close_icon_failed', '关闭按钮图标失败'],
          ['open_village_failed', '打开新村失败'],
          ['empty_booth_failed', '识别空摊位失败'],
          ['confirm_btn_fail', '查找确认或关闭失败'],
          ['feed_expand_failed', '查找展开饲料失败'],
          ['thief_chicken_check_failed', '偷吃野鸡识别失败'],
          ['sleep_entry', '去睡觉入口'],
          ['sleep_bed', '睡觉床'],
          ['signboard', '主界面外出|睡觉牌子'],
          ['confirm_btn', '确认或关闭'],
          ['friend_home_failed', '小鸡不在好友家'],
          ['chick_out', '小鸡外出'],
          ['thief_chicken', '有小偷鸡'],
          ['no_thief_chicken', '没小偷鸡'],
          ['eating_chicken', '小鸡吃饭中'],
          ['hungry_chicken', '小鸡没饭吃'],
          ['close_icon', '关闭按钮图标'],
          ['pick_shit', '有屎可以捡'],
          ['execute_pick_shit', '执行捡屎'],
          ['collect_muck', '收集饲料按钮'],
          ['speedup_eating', '加速吃饭中'],
          ['operate_booth', '可操作摊位'],
          ['empty_booth', '有空摊位'],
          ['no_empty_booth', '无空摊位'],
          ['booth_btn', '摆摊赚币按钮'],
          ['village_speedup', '加速产币按钮'],
        ]
      },
      showVConsole: window.vConsole && window.vConsole.isInited,
    }
  },
  methods: {
    onConfigLoad: function (config) {
      this.configs.yolo_save_list.forEach(item => {
        let itemKey = item[0]
        let dataKey = 'yolo_save_' + itemKey
        this.$set(this.configs, dataKey, config[dataKey])
      })
    },
  },
  watch: {
    showVConsole: function (newVal) {
      if (newVal) {
        window.vConsole = new VConsole()
      } else {
        window.vConsole && window.vConsole.destroy()
      }
    },
  },
  template: `
  <div>
  <van-cell-group>
    <switch-cell title="是否自动检测更新" v-model="configs.auto_check_update" />
    <switch-cell title="是否显示VConsole" v-model="showVConsole" />
    <switch-cell title="下次打开配置时清空缓存" v-model="configs.clear_webview_cache" />
    <switch-cell title="是否启用开发模式" v-model="configs.develop_mode" />
    <template v-if="configs.develop_mode">
      <tip-block>脚本执行时保存图片等数据，未启用开发模式时依旧有效，请不要随意开启。部分功能需要下载master分支才能使用，release分支代码开启后可能无法正常运行</tip-block>
      <switch-cell title="是否保存一些开发用的数据" v-model="configs.develop_saving_mode" />
      <switch-cell title="是否保存YOLO训练用的数据" v-model="configs.save_yolo_train_data" />
      <switch-cell title="是否启用可视化辅助工具" v-model="configs.enable_visual_helper" />
      <div style="padding-left: 10px;" v-if="!configs.save_yolo_train_data">
        <tip-block>是否按子项目保存YOLO训练数据</tip-block>
        <switch-cell v-for="yoloSaveItem in configs.yolo_save_list" :title="'是否保存' + yoloSaveItem[1]"
          v-model="configs['yolo_save_' + yoloSaveItem[0]]" />
      </div>
    </template>
  </van-cell-group>
  </div>`
}