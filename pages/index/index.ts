Page({
  data: {
    isPlaying: false,
    currentNews: "今天的AI新闻：OpenAI发布了GPT-4 Turbo，这是一个更强大、更高效的大型语言模型...",
    displayedNews: "",
    charIndex: 0,
    mouthOpen: false,
    mouthAnimation: null
  },

  onLoad() {
    // 创建动画实例
    this.mouthAnimation = wx.createAnimation({
      duration: 200,
      timingFunction: 'ease',
    })
  },

  togglePlayPause() {
    if (this.data.isPlaying) {
      this.stopAnimation()
    } else {
      this.startAnimation()
    }
  },

  startAnimation() {
    this.setData({
      isPlaying: true,
      displayedNews: "",
      charIndex: 0
    })
    
    // 开始文字动画
    this.textTimer = setInterval(() => {
      if (this.data.charIndex < this.data.currentNews.length) {
        this.setData({
          displayedNews: this.data.currentNews.slice(0, this.data.charIndex + 1),
          charIndex: this.data.charIndex + 1
        })
      } else {
        this.stopAnimation()
      }
    }, 100)

    // 开始嘴部动画
    this.mouthTimer = setInterval(() => {
      const mouthOpen = !this.data.mouthOpen
      this.mouthAnimation.scaleY(mouthOpen ? 0.5 : 1).step()
      this.setData({
        mouthOpen,
        mouthAnimation: this.mouthAnimation.export()
      })
    }, 200)
  },

  stopAnimation() {
    this.setData({ isPlaying: false })
    if (this.textTimer) clearInterval(this.textTimer)
    if (this.mouthTimer) clearInterval(this.mouthTimer)
  },

  onUnload() {
    this.stopAnimation()
  }
}) 