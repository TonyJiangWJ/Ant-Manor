
/**
 * 执行配置
 */
 const ExecuteConfig = {
  name: 'ExecuteConfig',
  mixins: [mixin_common],
  data () {
    return {
      configs: {
        // 是否使用加速卡 默认为true
        useSpeedCard: true,
        pick_shit: true,
        starBallScore: 205,
        // 倒计时结束 等待的窗口时间
        windowTime: 5,
        recheckTime: 5,
        feed_cycle_time: 300,
        speeded_feed_cycle_time: 240,
        usePaddle: true,
      }
    }
  },
  template: `<div>
    <switch-cell title="是否使用加速卡" v-model="configs.useSpeedCard" />
    <switch-cell title="是否捡屎" v-model="configs.pick_shit" />
    <tip-block>本地OCR需要指定的修改版AutoJS才可以使用，不支持或者关闭后将自动使用百度文本识别API进行识别</tip-block>
    <switch-cell title="是否使用本地ocr" v-model="configs.usePaddle" />
    <tip-block>脚本当前执行逻辑是，第一次喂食后等待20分钟，然后根据[循环检测等待时间]循环多次直到找到偷吃的野鸡或者达到40分钟后，
      根据倒计时（通过OCR识别，识别失败通过程序计算大约值）重新创建定时任务，定时任务会往后延期[喂食等待窗口时间]</tip-block>
    <tip-block>喂食等待窗口时间是为了避免倒计时计算不准确而加入的冗余时间，不建议设置成0</tip-block>
    <number-field v-model="configs.windowTime" label="喂食等待窗口时间" label-width="10em" placeholder="请输入喂食等待窗口时间" >
      <template #right-icon><span>分</span></template>
    </number-field>
    <tip-block>循环检测等待时间是驱赶野鸡的轮询间隔，不建议设置太低</tip-block>
    <number-field v-model="configs.recheckTime" label="循环检测等待时间" label-width="10em" placeholder="请输入循环检测等待时间" >
      <template #right-icon><span>分</span></template>
    </number-field>
    <tip-block>以下两项是用于配置一次喂食后饲料持续时间的配置，默认是300和240分；如果需要请别的小鸡做客吃饭需要将对应时间改为实际时长；当前脚本无法自动判断是否有邀请的小鸡，
      需要自己配置区域颜色等配置（且只针对一种模式，所以如果小鸡经常被叫回去的话还是不要邀请了）</tip-block>
    <number-field v-model="configs.feed_cycle_time" label="饲料食用周期时长" label-width="10em" placeholder="请输入饲料食用周期时长" >
      <template #right-icon><span>分</span></template>
    </number-field>
    <number-field v-model="configs.speeded_feed_cycle_time" label="使用加速卡后的食用时长" label-width="12em" placeholder="请输入使用加速卡后的食用时长" >
      <template #right-icon><span>分</span></template>
    </number-field>
    <number-field v-model="configs.starBallScore" label="星星球目标分数" label-width="10em" placeholder="请输入星星球目标分数" />
  </div>`
}