
/**
 * 执行配置
 */
 const ExecuteConfig = {
  name: 'ExecuteConfig',
  mixins: [mixin_common],
  data () {
    return {
      ocrPriorityOptions: [
        { text: '自动', value: 'auto' },
        { text: 'mlkit优先', value: 'mlkit' },
        { text: 'paddle优先', value: 'paddle' },
      ],
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
        // 本地ocr优先级
        local_ocr_priority: 'auto',
        // 小鸡睡觉配置
        to_sleep_position: true,
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
        // 星星球识别区域
        reco: [200, 1100, 750, 600],
      }
    }
  },
  template: `<div>
    <switch-cell title="是否使用加速卡" v-model="configs.useSpeedCard" />
    <switch-cell title="是否捡屎" v-model="configs.pick_shit" />
    <tip-block>当前OCR的机制是 如果已安装mlkitOcr插件则自动使用mlkit，未安装则尝试PaddleOCR（需要修改版AutoJS支持），AutoJS不支持则使用百度在线OCR，百度OCR有次数限制仅获取倒计时使用百度OCR，蚂蚁新村将无法使用</tip-block>
    <van-cell title="本地OCR优先级">
      <template #right-icon>
        <van-dropdown-menu active-color="#1989fa" class="cell-dropdown">
          <van-dropdown-item v-model="configs.local_ocr_priority" :options="ocrPriorityOptions" />
        </van-dropdown-menu>
      </template>
    </van-cell>
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
    <region-input-field :array-value="true" v-model="configs.reco" label="星星球识别区域" label-width="12em" />
    <tip-block>可以每天晚上八点到早上六点自动去睡觉，对 unit/去睡觉.js 创建每天晚上八点后的定时任务即可</tip-block>
    <position-input-field v-model="configs.to_sleep_entry" label="小鸡睡觉入口" label-width="12em" />
    <position-input-field v-model="configs.to_sleep_bed" label="小鸡床的位置" label-width="12em" />
    <van-cell center title="是否去家庭别墅睡觉" title-width="14rem" >
      <van-switch v-model="configs.to_sleep_position" size="1.24rem" />
    </van-cell>
    <tip-block>自动捐蛋配置，配置捐蛋按钮位置 对 unit/自动捐蛋.js 创建每天的定时任务即可</tip-block>
    <position-input-field v-model="configs.donate_egg" label="捐蛋按钮位置" label-width="12em" />
  </div>`
}