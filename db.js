const mysql = require('mysql')
const moment = require('moment')

function format(time) {
  if (!time) return null
  return moment(time).format('YYYY-MM-DD HH:mm:ss')
}

function transform(info) {
  return [
    info.userId, info.username, info.name, info.bio, info.followerCount,
    format(info.mediumMemberAt), format(info.createdAt), info.isWriterProgramEnrolled, null
  ]
}

class DB {
  constructor(config) {
    this.conn = mysql.createPool(config)
  }

  getExistingUserIds() {
    return new Promise((resolve, reject) => {
      this.conn.query('SELECT userId from Users', (err, results) => {
        if (err) {
          return reject(err)
        }
       return resolve(results.map(item => item.userId))
      });
    })
  } 

  getUserIds(limit) {
    return new Promise((resolve, reject) => {
      this.conn.query('SELECT userId from Queues order by id asc limit ' + limit, (err, results) => {
        if (err) {
          return reject(err)
        }
       return resolve(results.map(item => item.userId))
      });
    })
  } 

  deleteUserIds(userIds) {
    return new Promise((resolve, reject) => {
      this.conn.query('DELETE from Queues WHERE userId IN (?)', [userIds], (err, results) => {
        if (err) {
          return reject(err)
        }
        return resolve(userIds)
      })
    })
  }

  insertUserData(info) {
    if (!info) return
    const data = Array.isArray(info) ? info.map(transform) : [transform(info)]
    this.conn.query(`
      INSERT INTO Users
      (
        userId, username, name, bio, follower,
        mediumMemberAt, createdAt, isWriterProgramEnrolled, fr
      ) VALUES ?`, [data], (err) => {
        if (err) {
          // console.log(err)
        }
      }
    )
  }

  insertIntoQueue(list) {
    return new Promise((resolve, reject) => {
      const values = []
      for (let item of list) {
        values.push([item])
      }
      this.conn.query(`
        INSERT IGNORE INTO Queues (userId) VALUES ?`, [values], (err) => {
          if (err) {
            // console.log(err)
          }
          resolve()
        }
      )
    })
  }

}

module.exports = DB