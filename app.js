const DB = require('./db')
const Queue = require('./queue')
const config = require('./config')
const medium = require('./medium')
const utils = require('./utils')

async function main() {
  const db = new DB(config.db)
  const queue = new Queue(db)
  const existingUserIds = await db.getExistingUserIds()
  const userIdMap = {}
  for (let userId of existingUserIds) {
    userIdMap[userId] = true
  }

  utils.log('Existing userId:', existingUserIds.length)

  while(true) {
    const userIds = await queue.get(1)
    if (userIds.length === 0) {
      utils.log('Done')
      break;
    }

    const userId = userIds[0]
    if (userIdMap[userId]) {
      continue
    }
    userIdMap[userId] = true
    utils.log('userId:', userId)

    try {
      const userInfo = await medium.getUserInfo(userId)

      if (!userInfo.userId) {
        utils.log('getUerrInfo error, sleep for', config.delayWhenError)
        await utils.sleep(config.delayWhenError)
      }

      if (!userInfo.isMandarinUser) {
        utils.log(userId, 'not MandarinUser')
        continue
      }

      db.insertUserData(userInfo)

      if (userInfo.followerCount > 0) {
        let to = undefined
        let count = 0
        while (true) {
          const data = await medium.getFollowers(userInfo.userId, to)
          if (!data) {
            break
          }
          const { nextTo, followers } = data
          to = nextTo
          count += followers.length
          utils.log(userInfo.userId, 'fetching', count, 'followers')
          await queue.push(followers)
          if (followers.length === 0 || !to) {
            break;
          }
        }
      }
    } catch (err) {
      utils.log('sleep for', config.delayWhenError)
      utils.log(err)
      await utils.sleep(config.delayWhenError)
    }
  }
  process.exit()
}

main()