import cloud from 'wx-server-sdk'
import axios from 'axios'
import * as xml2js from 'xml2js'

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 新浪新闻RSS源
const SINA_RSS = {
  domestic: 'https://rss.sina.com.cn/news/china/focus.xml',  // 国内新闻
  international: 'https://rss.sina.com.cn/news/world/focus.xml'  // 国际新闻
}

// 解析RSS内容
async function parseRSS(xml: string) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, (err, result) => {
      if (err) {
        reject(err)
        return
      }
      resolve(result)
    })
  })
}

// 获取新闻内容
async function fetchNews(type: 'domestic' | 'international') {
  try {
    const url = SINA_RSS[type]
    const response = await axios.get(url)
    const result: any = await parseRSS(response.data)
    
    // 获取最新的一条新闻
    const latestNews = result.rss.channel[0].item[0]
    const title = latestNews.title[0]
    
    // 简化新闻内容，只返回标题
    return title
  } catch (error) {
    console.error('获取新闻失败:', error)
    throw error
  }
}

// 云函数入口
export async function main(event: any) {
  try {
    const { type } = event
    if (!type || !SINA_RSS[type]) {
      throw new Error('无效的新闻类型')
    }

    const news = await fetchNews(type)
    return {
      success: true,
      data: news
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
} 