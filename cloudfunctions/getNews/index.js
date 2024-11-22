const cloud = require('wx-server-sdk')
const { parseString } = require('xml2js')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 使用36氪的RSS源进行测试
const NEWS_SOURCES = {
  domestic: 'http://www.36kr.com/feed',  // 修改为36氪的RSS源
  international: 'http://www.36kr.com/feed'  // 暂时都用同一个源测试
}

// 将xml2js的parseString转换为Promise版本
const parseXML = (content) => {
  return new Promise((resolve, reject) => {
    parseString(content, {
      trim: true,
      explicitArray: false
    }, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

// 解析RSS内容
async function parseRSSContent(xmlContent) {
  try {
    const result = await parseXML(xmlContent)
    
    if (!result?.rss?.channel?.item) {
      throw new Error('Invalid RSS format')
    }

    // 获取所有新闻条目
    const items = Array.isArray(result.rss.channel.item) 
      ? result.rss.channel.item 
      : [result.rss.channel.item]

    console.log('\n========= 新闻列表 =========')
    // 转换为统一格式并打印发布日期
    const newsItems = items.map(item => {
      const pubDate = new Date(item.pubDate)
      console.log('\n------------------------')
      console.log('标题:', item.title)
      console.log('原始日期:', item.pubDate)
      console.log('格式化日期:', pubDate.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}))
      console.log('时间戳:', pubDate.getTime())
      console.log('------------------------\n')
      
      return {
        id: item.guid || item.link || '',
        title: item.title || '',
        content: item.description || '',
        ctime: pubDate.toISOString(),
        link: item.link || '',
        pubDate: pubDate.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})
      }
    })

    console.log(`共解析 ${newsItems.length} 条新闻`)
    console.log('========= 结束 =========\n')

    // 按发布日期排序(最新的在前面)
    return newsItems.sort((a, b) => 
      new Date(b.ctime).getTime() - new Date(a.ctime).getTime()
    )
  } catch (error) {
    console.error('解析RSS内容失败:', error)
    throw error
  }
}

// 云函数入口函数
exports.main = async (event) => {
  const { type } = event
  
  try {
    // 使用v-request调用http接口
    const result = await cloud.callFunction({
      name: 'v-request',
      data: {
        url: NEWS_SOURCES[type],
        method: 'GET',
        header: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    })

    if (!result?.result?.data) {
      throw new Error('获取RSS数据失败')
    }

    // 解析RSS内容
    const newsItems = await parseRSSContent(result.result.data)
    
    return {
      code: 0,
      data: newsItems
    }
  } catch (error) {
    console.error('获取新闻失败:', error)
    return {
      code: -1,
      error: error.message || '获取新闻失败'
    }
  }
}