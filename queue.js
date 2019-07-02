class Queue {
  constructor(db) {
    this.db = db
  }

  async get(limit) {
    const items = await this.db.getUserIds(limit)
    await this.db.deleteUserIds(items)
    return items
  }

  async push(list) {
    await this.db.insertIntoQueue(list)
  }
}

module.exports = Queue