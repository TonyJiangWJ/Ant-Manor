const FodderConfig = {
  name: 'FodderConfig',
  mixins: [mixin_common],
  data() {
    return {
      configs: {
        fodder_btn: '',
        close_interval: '',
        chopping_board: '',
        farm_collect: '',
        feed_package_full: '饲料袋.*满.*|知道了',
        ai_type: 'kimi',// kimi、chatgml or empty
        kimi_api_key: '',
        chatgml_api_key: '',
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
    <tip-block style="margin: 0.5rem">如支持ocr则将使用ocr识别领饲料入口</tip-block>
    <base64-image-viewer title="领饲料按钮" v-model="configs.fodder_btn"/>
    <base64-image-viewer title="关闭按钮" v-model="configs.close_interval"/>
    <base64-image-viewer title="菜板" v-model="configs.chopping_board"/>
    <base64-image-viewer title="农场领取" v-model="configs.farm_collect"/>
    <van-field v-model="configs.feed_package_full" label="饲料袋已满" type="text" placeholder="请输入饲料袋已满控件文本" input-align="right" />
    <tip-block>AI答题配置，留空使用默认配置。KIMI令牌请前往开放平台申请：https://platform.moonshot.cn/console/api-keys</tip-block>
    <tip-block>智谱清言(chatgml)令牌请前往开放平台申请（新用户首月免费100万token，后续似乎按量收费，但是响应比Kimi快）：https://open.bigmodel.cn/usercenter/apikeys</tip-block>
    <tip-block>默认的免费接口是个大智障经常性出错或者答错，所以尽量自己去申请KIMI的接口权限。另外真的很推荐使用KIMI小程序或者网页端服务，大部分情况下都很够用</tip-block>
    <tip-block>这个AI答题功能也适用于蚂蚁庄园和蚂蚁新村，打开对应答题页面再点击AI答题即可</tip-block>
    <tip-block>AI类型可选：kimi、chatgml 留空或者乱填使用默认弱智AI. chatgml速度较快但后期可能需要付费，他和kimi之间的正确率各有优劣，请自行选择</tip-block>
    <van-field v-model="configs.ai_type" label="AI类型" label-width="14em" type="text" placeholder="留空使用默认配置" input-align="right"/>
    <van-field v-model="configs.kimi_api_key" label="KIMI密钥" label-width="14em" type="text" placeholder="留空使用默认AI接口" input-align="right"/>
    <van-field v-model="configs.chatgml_api_key" label="智谱清言密钥" label-width="14em" type="text" placeholder="留空使用默认AI接口" input-align="right"/>
  </div>`
}