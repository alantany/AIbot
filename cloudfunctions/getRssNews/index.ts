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
      xml2js.parseString(xmlData, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
    
    // 提取新闻条目
    const items = result.rss.channel[0].item.map(item => ({
      title: item.title[0],
      description: item.description[0],
      pubDate: item.pubDate[0]
    }))
    
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