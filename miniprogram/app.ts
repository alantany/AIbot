// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 初始化云开发环境
    wx.cloud.init({
      env: 'aibot-7gdadr2kc515d223',  // 使用你的云开发环境ID
      traceUser: true
    })

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        console.log(res.code)
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    })
  },
})