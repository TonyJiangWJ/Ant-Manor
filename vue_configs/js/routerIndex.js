
const router = new VueRouter({
  scrollBehavior(to, from, savedPosition) {
    console.log('savedPosition', savedPosition)
    if (savedPosition) {
        return savedPosition
    }
    return {x: 0, y: 0}
  },
  routes: [
    { path: '/', component: Index, meta: { index: 0 } },
    { path: '/basic/lock', component: LockConfig, meta: { index: 1 } },
    { path: '/basic/executeConfig', component: ExecuteConfig, meta: { index: 1 } },
    { path: '/basic/colorRegion', component: ColorRegionConfigs, meta: { index: 1 } },
    { path: '/basic/log', component: LogConfig, meta: { index: 1 } },
    { path: '/advance/skipPackage', component: SkipPackageConfig, meta: { index: 1 } },
    { path: '/advance/common', component: AdvanceCommonConfig, meta: { index: 1 } },
    { path: '/about', component: About, meta: { index: 1 } },
    { path: '/about/develop', component: DevelopConfig, meta: { index: 2, title: '开发模式' } },
    { path: '/about/releases', component: HistoryRelease, meta: { index: 3, title: '更新历史' } },
    { path: '/village/villageConfig', component: VillageConfig, meta: { index: 1 } },
    { path: '/village/share', component: AccountManager, meta: { index: 1 } },
    { path: '/fodder/fodderConfig', component: FodderConfig, meta: { index: 1 } },
    { path: '/QA', component: QuestionAnswer, meta: { index: 1, title: '常见问题' } },
    { path: '/readme', component: Readme, meta: { index: 1, title: '脚本说明README' } },
  ]
})

