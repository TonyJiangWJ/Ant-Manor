let Index = {
  mixins: [mixin_methods],
  data: function () {
    return {
      menuItems: [
        {
          title: '锁屏设置',
          link: '/basic/lock'
        },
        {
          title: '执行配置',
          link: '/basic/executeConfig'
        },
        {
          title: '区域颜色配置',
          link: '/basic/colorRegion'
        },
        {
          title: '蚂蚁新村配置',
          link: '/village/villageConfig'
        },
        {
          title: '领饲料配置',
          link: '/fodder/fodderConfig'
        },
        {
          title: '日志设置',
          link: '/basic/log'
        },
        {
          title: '前台应用白名单设置',
          link: '/advance/skipPackage'
        },
        {
          title: '视频应用设置',
          link: '/advance/videoPackage'
        },
        {
          title: '高级设置',
          link: '/advance/common'
        },
        {
          title: '新村助力设置',
          link: '/village/share'
        },
        {
          title: '关于项目',
          link: '/about'
        },
        {
          title: '常见问题',
          link: '/QA'
        },
        {
          title: '脚本说明README',
          link: '/readme'
        },
      ]
    }
  },
  methods: {
    routerTo: function (item) {
      this.$router.push(item.link)
      this.$store.commit('setTitleWithPath', { title: item.title, path: item.link })
    }
  },
  template: `<div>
    <van-cell-group>
      <van-cell :title="item.title" is-link v-for="item in menuItems" :key="item.link" @click="routerTo(item)"/>
    </van-cell-group>
  </div>`
}
