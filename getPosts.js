const DB = require('./db')
const Queue = require('./queue')
const config = require('./config')
const medium = require('./medium')
const utils = require('./utils')

async function main() {
  const db = new DB(config.db)
  const userIds = await db.getTopUsers()
  //const userIds = ['11162699a102']
  let cursor = 0
  while(cursor < userIds.length) {
    const userId = userIds[cursor++]
    if (!userId) {
      utils.log('Done')
      break;
    }

    utils.log(cursor, 'userId:', userId)

    try {

      let to = undefined
      let count = 0
      while (true) {
        const data = await medium.getPosts(userId, to)
        if (!data) {
          break
        }
        const { nextTo, posts } = data
        to = nextTo
        count += posts.length
        utils.log(userId, 'fetching', count, 'posts')
        
        console.log('to', to)
        const newPosts = (posts.map(post => ({
          postId: post.id,
          title: post.title,
          userId: post.creatorId,
          detectedLanguage: post.detectedLanguage,
          firstPublishedAt: post.firstPublishedAt,
          clap: post.virtuals.totalClapCount
        })))
        console.log(newPosts.map(post => post.title))
        await db.insertPostData(newPosts)
        
        if (posts.length === 0 || !to) {
          break;
        }
      }
    } catch (err) {
      utils.log('sleep for', config.delayWhenError)
      utils.log(err)
      await utils.sleep(config.delayWhenError)
    }
  }
  await utils.sleep(3000)
  process.exit()
}

main()