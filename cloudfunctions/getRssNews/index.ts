import cloud from 'wx-server-sdk'
import axios from 'axios'
import * as xml2js from 'xml2js'

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 新华网RSS源
const RSS_URLS = {
  domestic: 'http://www.xinhuanet.com/politics/news_politics.xml',
  international: 'http://www.xinhuanet.com/world/news_world.xml'
}

export async function main(event: any) {
  const { type } = event
  
  try {
    // 获取RSS内容
    const response = await axios.get(RSS_URLS[type])
    const xmlData = response.data
    
    // 解析XML
    const result = await new Promise((resolve, reject) => {
      xml2js.parseString(xmlData, {
        explicitArray: false,  // 不要将单个元素转换为数组
        mergeAttrs: true      // 合并属性
      }, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
    
    // 提取新闻条目，包括完整内容
    const items = result.rss.channel.item.map(item => ({
      title: item.title,
      description: item.description,
      content: item['content:encoded'] || item.description,  // 尝试获取完整内容
      pubDate: item.pubDate,
      link: item.link
    }))
    
    console.log('RSS新闻条目:', items)
    
    return {
      success: true,
      items
    }
  } catch (error) {
    console.error('获取RSS新闻失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
} 