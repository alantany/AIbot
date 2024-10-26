// index.js
Page({
  data: {
    inputValue: '',
    chatHistory: [],
    loading: false,
    recording: false
  },

  onLoad() {
    // 初始化云开发
    wx.cloud.init({
      env: 'aibot-7gdadr2kc515d223' // 更新为你的环境ID
    })
    
    // 加载历史消息
    this.loadHistory()
  },

  // 加载历史消息
  async loadHistory() {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('chat_history')
        .orderBy('timestamp', 'asc')
        .get()
      
      this.setData({
        chatHistory: res.data
      })
    } catch (error) {
      console.error('加载历史消息失败:', error)
    }
  },

  // 输入框内容变化
  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    })
  },

  // 发送消息
  async sendMessage() {
    if (!this.data.inputValue.trim() || this.data.loading) return
    
    const userMessage = this.data.inputValue
    
    this.setData({
      inputValue: '',
      loading: true
    })

    try {
      console.log('开始调用云函数...')
      // 调用云函数
      const result = await wx.cloud.callFunction({
        name: 'chatgpt',
        data: {
          message: userMessage
        }
      })
      console.log('云函数返回结果:', result)

      if (result.result.error) {
        throw new Error(result.result.error)
      }

      // 刷新消息历史
      await this.loadHistory()
      console.log('历史消息已更新')
      
    } catch (error) {
      console.error('发送消息失败:', error)
      wx.showToast({
        title: '发送失败: ' + error.message,
        icon: 'none',
        duration: 2000
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 开始录音
  startRecord() {
    this.setData({ recording: true })
    const recorderManager = wx.getRecorderManager()
    
    recorderManager.onStart(() => {
      wx.showToast({
        title: '开始录音',
        icon: 'none'
      })
    })
    
    recorderManager.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3'
    })
  },

  // 结束录音
  stopRecord() {
    if (!this.data.recording) return
    
    this.setData({ recording: false })
    const recorderManager = wx.getRecorderManager()
    
    recorderManager.onStop(async (res) => {
      wx.showLoading({ title: '识别中...' })
      
      try {
        // 使用微信自带的语音识别
        const result = await wx.startRecord({
          success: function (res) {
            const tempFilePath = res.tempFilePath
            wx.uploadFile({
              url: 'https://vop.baidu.com/server_api',
              filePath: tempFilePath,
              name: 'file',
              success: function(res) {
                console.log(res.data)
              }
            })
          }
        })

        if (result && result.result) {
          this.setData({
            inputValue: result.result
          })
        } else {
          throw new Error('识别失败')
        }
        
      } catch (error) {
        console.error('语音识别失败:', error)
        wx.showToast({
          title: '识别失败',
          icon: 'none'
        })
      } finally {
        wx.hideLoading()
      }
    })
    
    recorderManager.stop()
  }
})
