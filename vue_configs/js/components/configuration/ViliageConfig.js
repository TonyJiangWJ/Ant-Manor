const ViliageConfig = {
  name: 'ViliageConfig',
  mixins: [mixin_common],
  data() {
    return {
      configs: {
        checking_mail_box: '',
        empty_booth: '',
        my_booth: '',
        booth_position_left: [193, 1659, 436, 376],
        booth_position_right: [629, 1527, 386, 282],
      }
    }
  },
  methods: {
    onConfigLoad(config) {
      let viliageConfig = config.viliage_config
      Object.keys(this.configs).forEach(key => {
        this.$set(this.configs, key, viliageConfig[key])
      })
    },
    doSaveConfigs() {
      let newConfigs = this.filterErrorFields(this.configs)
      $app.invoke('saveExtendConfigs', { configs: newConfigs, prepend: 'viliage' })
      newConfigs = this.filterErrorFields({
        
      })
    },
    openGrayDetector: function () {
      $app.invoke('openGrayDetector', {})
    },
  },
  template: `
  <div>
    <tip-block style="margin: 0.5rem">区域输入框左滑可以通过滑块输入数值，也可以通过取色工具获取目标区域信息：<van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="openGrayDetector">打开取色工具</van-button></tip-block>
    <base64-image-viewer title="校验是否进入新村界面" v-model="configs.checking_mail_box"/>
    <base64-image-viewer title="校验空摊位" v-model="configs.empty_booth"/>
    <base64-image-viewer title="我的小摊" v-model="configs.my_booth"/>
    <region-input-field :array-value="true" v-model="configs.booth_position_left" label="校验左侧摊位OCR" label-width="12em" />
    <region-input-field :array-value="true" v-model="configs.booth_position_right" label="校验右侧摊位OCR" label-width="12em" />
  </div>`
}