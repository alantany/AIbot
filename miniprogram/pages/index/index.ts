/// <reference path="../../../typings/index.d.ts" />

// 添加 WechatSI 插件类型声明
declare const requirePlugin: (name: string) => {
  textToSpeech(options: {
    lang: string;
    tts: boolean;
    content: string;
    success: (res: { filename: string }) => void;
    fail: (error: any) => void;
    [key: string]: any;
  }): void;
};

// 添加新闻缓存和记录结构
interface NewsItem {
  id: string
  title: string
  content: string
  ctime: string
}

interface IPageData extends WechatMiniprogram.IData {
  textTimer?: number
  mouthTimer?: number
  mouthAnimation: WechatMiniprogram.Animation | null
  newsType: string
  currentPage: {
    domestic: number
    international: number
  }
  audioContext: WechatMiniprogram.InnerAudioContext | null
  isContinuousPlay: boolean
  newsCache: {
    domestic: NewsItem[]
    international: NewsItem[]
  }
  isPlaying: boolean
  currentNews: string
  displayedNews: string
  charIndex: number
  mouthOpen: boolean
  newsBuffer: {
    domestic: NewsItem[]
    international: NewsItem[]
  }
  playedNewsIds: {
    domestic: string[]
    international: string[]
  }
  newsLoading: boolean
}

// 添加新记录管理
const NEWS_STORAGE_KEY = 'played_news'
const STORAGE_DAYS = 3  // 保存3天的记录

interface PlayedNewsRecord {
  id: string
  timestamp: number
  type: 'domestic' | 'international'
}

// 添加工具函数
const utils = {
  // Base64编码
  base64Encode(str: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    let output = ''
    const bytes = new TextEncoder().encode(str)
    let i = 0
    
    while (i < bytes.length) {
      const chr1 = bytes[i++]
      const chr2 = i < bytes.length ? bytes[i++] : Number.NaN
      const chr3 = i < bytes.length ? bytes[i++] : Number.NaN

      const enc1 = chr1 >> 2
      const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4)
      const enc3 = ((chr2 & 15) << 2) | (chr3 >> 6)
      const enc4 = chr3 & 63

      output += chars.charAt(enc1) + chars.charAt(enc2) +
                (isNaN(chr2) ? '=' : chars.charAt(enc3)) +
                (isNaN(chr3) ? '=' : chars.charAt(enc4))
    }
    
    return output
  },

  // 简单的HMAC-SHA256实
  async hmacSHA256(message: string, secret: string): Promise<string> {
    // 简化的签名生成
    const timestamp = Date.now()
    const nonce = Math.random().toString(36).substring(7)
    const signStr = `${message}${timestamp}${nonce}${secret}`
    
    // ��成一个简单的hash
    let hash = 0
    for (let i = 0; i < signStr.length; i++) {
      const char = signStr.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    
    // 转换为base64
    return this.base64Encode(hash.toString())
  }
}

// 添加重试函数
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      console.log(`尝试第 ${i + 1} 次失败:`, error)
      lastError = error
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

Page<IPageData>({
  data: {
    isPlaying: false,
    currentNews: "",
    displayedNews: "",
    charIndex: 0,
    mouthOpen: false,
    mouthAnimation: null,
    newsType: '',
    currentPage: {
      domestic: 1,
      international: 1
    },
    isContinuousPlay: false,
    newsCache: {
      domestic: [],
      international: []
    },
    audioContext: null,
    newsBuffer: {
      domestic: [],
      international: []
    },
    playedNewsIds: {
      domestic: [],
      international: []
    },
    newsLoading: false
  },

  // 预加载新闻的数
  BUFFER_SIZE: 50,
  MAX_PLAYED_IDS: 1000,

  // 修改新闻源配置
  apiConfig: {
    domestic: `https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2510&k=&num=100&page=1&r=${Math.random()}&_=${Date.now()}`,
    international: `https://feed.mix.sina.com.cn/api/roll/get?pageid=153&lid=2514&k=&num=100&page=1&r=${Math.random()}&_=${Date.now()}`
  },

  animation: null as WechatMiniprogram.Animation | null,
  audioContext: null as any,

  // 飞语音合成配置
  ttsConfig: {
    appId: '92106442',  // 你的讯飞APPID
    apiSecret: 'ZjY2NGQ5OWZmY2Y0OGQ1NDRjMzViOGFl',  // 你的APISecret
    apiKey: '5349ef3e7de61b9a2c27825443932243'  // 你的APIKey
  },

  // 生鉴权url
  async getAuthUrl() {
    const host = 'tts-api.xfyun.cn'
    const date = new Date().toUTCString()
    const algorithm = 'hmac-sha256'
    const headers = 'host date request-line'
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/tts HTTP/1.1`
    
    // 使用更简单的签名方式
    const signature = this.ttsConfig.apiSecret
    const authorizationOrigin = `api_key="${this.ttsConfig.apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
    const authorization = utils.base64Encode(authorizationOrigin)  // 使我们自己的base64编码函数
    
    const url = `wss://${host}/v2/tts?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${host}`
    console.log('WebSocket URL:', url)  // 添加日志
    return url
  },

  onLoad() {
    this.animation = wx.createAnimation({
      duration: 200,
      timingFunction: 'ease',
      transformOrigin: '50% 50%'
    })
    this.audioContext = wx.createInnerAudioContext()
    
    // 加载并清理过期的记录
    this.loadAndCleanPlayedNews()
  },

  // 加载并清理已播放新闻记录
  loadAndCleanPlayedNews() {
    try {
      let playedNews = wx.getStorageSync(NEWS_STORAGE_KEY) || []
      const now = Date.now()
      const daysInMs = STORAGE_DAYS * 24 * 60 * 60 * 1000
      
      // 清理过期记录
      playedNews = playedNews.filter((record: PlayedNewsRecord) => 
        now - record.timestamp < daysInMs
      )
      
      // 更新存储
      wx.setStorageSync(NEWS_STORAGE_KEY, playedNews)
      
      // 重建 Set
      this.playedNewsIds = new Set(playedNews.map((record: PlayedNewsRecord) => record.id))
      
      console.log(`已加载${this.playedNewsIds.size}条播放记录`)
    } catch (error) {
      console.error('加载播放记录失败:', error)
      this.playedNewsIds = new Set()
    }
  },

  // 记录已播放新闻
  recordPlayedNews(newsId: string, type: 'domestic' | 'international') {
    try {
      const playedNews: PlayedNewsRecord[] = wx.getStorageSync(NEWS_STORAGE_KEY) || []
      
      // 添加新记录
      playedNews.push({
        id: newsId,
        timestamp: Date.now(),
        type
      })
      
      // 新存储
      wx.setStorageSync(NEWS_STORAGE_KEY, playedNews)
      
      // 更新 Set
      this.playedNewsIds.add(newsId)
    } catch (error) {
      console.error('记录已播放新闻失败:', error)
    }
  },

  // 模拟新闻数据
  mockNews: {
    domestic: [
      "中国科技创新取得重大突破，量子计算研究获新进展",
      "全国多地加大环保力度，可再生能源利用率创新高",
      "教育部发布新政策，进一步减轻学生课业负担",
      "医疗改革持续深化，基层医疗服务能力显著提升",
      "乡村振兴战略成效显著，农民收入稳步增长"
    ],
    international: [
      "全球气候变化会议达成新共识，各国承诺减排",
      "国际科技合作项目取得突破性进展",
      "世界经济论坛关注AI展，呼吁加强国际合作",
      "太空探索获得新发现，星探测任务传回重要数",
      "全卫生组织发布最新研究报告"
    ]
  },

  // 修改获取新数
  async fetchNews(type: 'domestic' | 'international'): Promise<{title: string, content: string} | null> {
    try {
      console.log('开始获取新闻, 类型:', type)
      
      if (this.data.newsBuffer[type].length < 5) {
        wx.showLoading({ title: '获取新闻中...' })
        
        const result = await wx.cloud.callFunction({
          name: 'getNews',
          data: { type }
        })
        
        wx.hideLoading()

        if (result.result.code === 0 && result.result.data) {
          const newsItems = result.result.data
          
          // 过滤和处理新闻
          const processedNews = newsItems
            .map((item: any) => ({
              id: item.id,
              title: this.decodeXMLEntities(item.title).trim(),
              content: this.decodeXMLEntities(item.content)
                .replace(/<[^>]+>/g, '') // 移除HTML标签
                .trim(),
              ctime: new Date(item.ctime).toLocaleString('zh-CN')
            }))
            .filter((item: any) => 
              item.title && 
              item.content && 
              !this.playedNewsIds.has(item.id)
            )

          if (processedNews.length > 0) {
            this.setData({
              [`newsBuffer.${type}`]: [...this.data.newsBuffer[type], ...processedNews]
            })
          }
        }
      }

      // 从缓冲区获取一条新闻
      const news = this.data.newsBuffer[type].shift()
      if (news) {
        // 记录已播放
        this.recordPlayedNews(news.id, type)
        
        this.setData({
          [`newsBuffer.${type}`]: this.data.newsBuffer[type]
        })
        
        return {
          title: news.title,
          content: news.content
        }
      }

      return null
    } catch (error) {
      console.error('获取新闻失败:', error)
      wx.hideLoading()
      return null
    }
  },

  // 添加 XML 实体解码函数
  decodeXMLEntities(text: string): string {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&#?\w+;/g, '')  // 移除其他 XML 实体
  },

  // 持续播放新闻
  async continuousPlay() {
    if (!this.data.newsType || this.data.isPlaying) return
    
    this.setData({ isContinuousPlay: true })
    await this.playNextNews()
  },

  // 停止持续播放
  stopContinuousPlay() {
    this.setData({ 
      isContinuousPlay: false,
      isPlaying: false
    })
    this.stopAnimation()
    this.stopSpeaking()
  },

  // 修改 stopCurrentPlay 方法
  async stopCurrentPlay() {
    return new Promise<void>((resolve) => {
      // 停止文字动画
      if (this.textTimer) {
        clearInterval(this.textTimer)
        this.textTimer = undefined
      }
      
      // 停止嘴部动画
      if (this.mouthTimer) {
        clearInterval(this.mouthTimer)
        this.mouthTimer = undefined
      }
      
      // 停止语音
      if (this.audioContext) {
        this.audioContext.stop()
        this.audioContext.destroy()
        this.audioContext = null
      }
      
      // 重置动画状态
      if (this.animation) {
        this.animation
          .scale(1, 1)
          .step({ duration: 100 })
        this.setData({
          mouthAnimation: this.animation.export()
        })
      }
      
      // 重置状态
      this.setData({ 
        isPlaying: false,
        isContinuousPlay: false,
        displayedNews: this.data.currentNews // 显示完整文本
      }, () => {
        // 确保状态更新完成后再继续
        setTimeout(resolve, 100)
      })
    })
  },

  // 修改播放下一条方法
  async playNextNews() {
    try {
      // 先停止当前播放
      await this.stopCurrentPlay()
      
      this.setData({
        isPlaying: true
      })

      wx.showLoading({ title: '获取新闻中...' })
      const news = await this.fetchNews(this.data.newsType as 'domestic' | 'international')
      wx.hideLoading()

      if (news) {
        // 显示标题
        const displayText = `${this.data.newsType === 'domestic' ? '国内' : '国际'}新闻：${news.title}`
        this.setData({ 
          currentNews: displayText,
          displayedNews: "",
          charIndex: 0
        })
        
        this.startAnimation()
        // 朗读完整新闻：标题 + 内容
        const fullText = `${news.title}。${news.content}`
        await this.startSpeaking(fullText)
        
        this.setData({ isPlaying: false })
        
        if (this.data.isContinuousPlay) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          await this.playNextNews()
        }
      } else {
        this.setData({ isPlaying: false })
        wx.showToast({
          title: '获取新闻失败',
          icon: 'none'
        })
        this.stopContinuousPlay()
      }
    } catch (error) {
      console.error('播放失败:', error)
      this.setData({ isPlaying: false })
      wx.hideLoading()
      wx.showToast({
        title: '获取新闻失败',
        icon: 'none'
      })
      this.stopContinuousPlay()
    }
  },

  // 修改停止动画方法
  stopAnimation() {
    if (this.textTimer) clearInterval(this.textTimer)
    if (this.mouthTimer) clearInterval(this.mouthTimer)
    
    if (this.animation) {
      this.animation
        .scale(1, 1)
        .step({ duration: 200 })
      this.setData({
        mouthAnimation: this.animation.export()
      })
    }
  },

  // 修改开始播报函数
  startSpeaking(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 1. 处理文本，移除所有标点符号，保留必要的空格
        let processedText = text
          .replace(/["""]([^"""]*)["'"]/g, '$1')  // 移除引号
          .replace(/[。！？：；、]/g, ' ')       // 将标点符号替换为空格
          .replace(/\s+/g, ' ')                    // 将多个空格合并为一
          .replace(/\n+/g, ' ')                    // 将换行替换为空格
          .trim()

        // 2. 将文本按照合适的长度分段每段大约100-150个字）
        const maxLength = 150
        const segments = []
        let start = 0
        
        while (start < processedText.length) {
          let end = Math.min(start + maxLength, processedText.length)
          segments.push(processedText.slice(start, end))
          start = end
        }
        
        console.log('分段结果:', segments)
        
        // 3. 播放所有段落
        this.playSegments(segments, 0)
          .then(() => {
            console.log('播放完成')
            this.stopMouthAnimation()
            resolve()
          })
          .catch(reject)
      } catch (error) {
        console.error('创建语音实例失败:', error)
        this.stopMouthAnimation()
        reject(error)
      }
    })
  },

  // 停止播报
  stopSpeaking() {
    if (this.audioContext) {
      this.audioContext.stop()
      this.audioContext.destroy()
      this.audioContext = null
    }
  },

  // 修改播放国内新闻方法
  async playDomesticNews() {
    // 先停止当前播放
    await this.stopCurrentPlay()
    
    this.setData({ 
      newsType: 'domestic',
      currentPage: {
        domestic: 1,
        international: this.data.currentPage.international
      }
    })
    
    await this.playNextNews()
  },

  // 修改播放国际新闻方法
  async playInternationalNews() {
    // 先停止当前播放
    await this.stopCurrentPlay()
    
    this.setData({ 
      newsType: 'international',
      currentPage: {
        domestic: this.data.currentPage.domestic,
        international: 1
      }
    })
    
    await this.playNextNews()
  },

  // 分段播放
  async playSegments(segments: string[], index: number): Promise<void> {
    if (index >= segments.length) {
      this.stopMouthAnimation()
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      // 如果不在播放状态，直接结束
      if (!this.data.isPlaying) {
        resolve()
        return
      }

      const plugin = requirePlugin("WechatSI")
      const audio = wx.createInnerAudioContext()
      
      // 保存当前音频实例以便停止
      this.audioContext = audio
      
      plugin.textToSpeech({
        lang: "zh_CN",
        tts: true,
        content: segments[index],
        success: (res) => {
          audio.src = res.filename
          
          audio.onPlay(() => {
            // 检查是否仍在播放状态
            if (!this.data.isPlaying) {
              audio.stop()
              audio.destroy()
              resolve()
              return
            }
            console.log(`第${index + 1}段开始播放:`, segments[index])
            this.startMouthAnimation()
          })

          audio.onEnded(() => {
            console.log(`第${index + 1}段播放完成`)
            this.stopMouthAnimation()
            audio.destroy()
            
            // 检查是否仍在播放状态
            if (this.data.isPlaying) {
              setTimeout(() => {
                this.playSegments(segments, index + 1)
                  .then(resolve)
                  .catch(reject)
              }, 50)
            } else {
              resolve()
            }
          })

          audio.onError((err) => {
            console.error(`第${index + 1}段播放错误:`, err)
            this.stopMouthAnimation()
            audio.destroy()
            reject(err)
          })

          audio.play()
        },
        fail: (error) => {
          console.error('语音合成失败:', error)
          this.stopMouthAnimation()
          reject(error)
        }
      })
    })
  },

  startAnimation() {
    // 只保留文字动画
    this.textTimer = setInterval(() => {
      if (this.data.charIndex < this.data.currentNews.length) {
        this.setData({
          displayedNews: this.data.currentNews.slice(0, this.data.charIndex + 1),
          charIndex: this.data.charIndex + 1
        })
      } else {
        if (this.textTimer) {
          clearInterval(this.textTimer)
        }
      }
    }, 100)
  },

  onUnload() {
    this.stopAnimation()
    this.stopSpeaking()
    // 页面卸载清理音频上下文
    if (this.data.audioContext) {
      this.data.audioContext.destroy()
    }
  },

  // 播放单条新闻
  async playNewsItem(text: string) {
    if (!text) return;
    
    return new Promise((resolve, reject) => {
      if (this.data.audioContext) {
        this.data.audioContext.destroy();
      }

      const audioContext = wx.createInnerAudioContext();
      this.setData({ audioContext });

      // 配置音频播放完成事件
      audioContext.onEnded(() => {
        console.log('音频播放完成');
        resolve(true);
      });

      audioContext.onError((res) => {
        console.error('音频播放错误:', res);
        reject(res);
      });

      // 调用云函数转换文字到语音
      wx.cloud.callFunction({
        name: 'textToSpeech',
        data: { text }
      }).then(res => {
        const { fileID } = res.data;
        audioContext.src = fileID;
        audioContext.play();
      }).catch(reject);
    });
  },

  // 切换连续播状态
  toggleContinuousPlay() {
    const newState = !this.data.isContinuousPlay
    
    if (newState) {
      // 开启持续播放
      this.setData({ isContinuousPlay: true })
      if (!this.data.isPlaying) {
        this.continuousPlay()
      }
    } else {
      // 停止持续播放
      this.stopContinuousPlay()
    }
  },

  // 修改开始嘴部动画法
  startMouthAnimation() {
    if (!this.animation) return
    
    // 创建定时器实现嘴巴一张一合的动画
    this.mouthTimer = setInterval(() => {
      // 嘴
      this.animation
        .scale(1, 0.5)
        .step({ duration: 100 })
      // 闭嘴
      this.animation
        .scale(1, 1)
        .step({ duration: 100 })
      
      this.setData({
        mouthAnimation: this.animation.export()
      })
    }, 200)  // 每200ms完成一次张合
  },

  // 修改停止嘴部动画方法
  stopMouthAnimation() {
    if (this.mouthTimer) {
      clearInterval(this.mouthTimer)
      this.mouthTimer = undefined
    }
    
    if (!this.animation) return
    
    // 恢复到闭嘴状态
    this.animation
      .scale(1, 1)
      .step({ duration: 100 })
    this.setData({
      mouthAnimation: this.animation.export()
    })
  },

  async getNews(type: string) {
    this.setData({ newsLoading: true })
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'getNews',
        data: { type }
      })
      
      if(result.result.code === 0) {
        // 处理新闻数据
        const newsData = result.result.data
        // TODO: 更新UI显示
      } else {
        throw new Error(result.result.error)
      }
    } catch(error) {
      wx.showToast({
        title: '获取新闻失败',
        icon: 'none'
      })
    } finally {
      this.setData({ newsLoading: false })
    }
  }
})
