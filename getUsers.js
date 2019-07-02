const DB = require('./db')
const Queue = require('./queue')
const config = require('./config')
const medium = require('./medium')
const utils = require('./utils')

async function main() {
  const db = new DB(config.db)
  const queue = new Queue(db)

  while(true) {
    const userIds = await queue.get(config.batchLimit)
    if (userIds.length === 0) {
      utils.log('Done')
      break;
    }

    utils.log('userIds:', userIds)

    try {
      let responses = []
      await utils.sleep(config.randomDelay())
      while(true) {
        const reqs = userIds.map(medium.getUserInfo)
        responses = await Promise.all(reqs)
        const errorCount = responses.filter(item => !item.userId)
        const errorRate = errorCount.length / responses.length
        utils.log('Error rate:', errorRate)
        if (errorRate > config.errorRateTolerance) {
          utils.log('Sleep for', config.delayWhenError)
          await utils.sleep(config.delayWhenError)
        } else {
          break;
        }
      }
      
      const mandarinUsers = responses.filter(item => item.isMandarinUser)
      db.insertUserData(mandarinUsers)
      utils.log('Added ', mandarinUsers.length)
    } catch(err) {
      utils.log('Error: ', err)
      await utils.sleep(config.delayWhenError)
    }
  }
  await utils.sleep(1000)
  process.exit()
}

main()