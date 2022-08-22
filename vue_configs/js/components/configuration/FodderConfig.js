const FodderConfig = {
  name: 'FodderConfig',
  mixins: [mixin_common],
  data() {
    return {
      configs: {
        fodder_btn: '',
        close_interval: '',
        feed_package_full: '饲料袋.*满.*|知道了',
      }
    }
  },
  methods: {
    onConfigLoad(config) {
      let fodderConfig = config.fodder_config
      Object.keys(this.configs).forEach(key => {
        this.$set(this.configs, key, fodderConfig[key])
      })
    },
    doSaveConfigs() {
      let newConfigs = this.filterErrorFields(this.configs)
      $app.invoke('saveExtendConfigs', { configs: newConfigs, prepend: 'fodder' })
    },
    openGrayDetector: function () {
      $app.invoke('openGrayDetector', {})
    },
  },
  template: `
  <div>
    <tip-block style="margin: 0.5rem">区域输入框左滑可以通过滑块输入数值，也可以通过取色工具获取目标区域信息：<van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="openGrayDetector">打开取色工具</van-button></tip-block>
    <base64-image-viewer title="领饲料按钮" v-model="configs.fodder_btn"/>
    <base64-image-viewer title="关闭按钮" v-model="configs.close_interval"/>
    <van-field v-model="configs.feed_package_full" label="饲料袋已满" type="text" placeholder="请输入饲料袋已满控件文本" input-align="right" />
  </div>`
}