module.exports = {
  db: {
    connectionLimit: 10,
    host     : '',
    user     : '',
    password : '',
    database : '',
    charset: 'utf8mb4'
  },
  batchLimit: 10, // 一次抓多少筆使用者資料
  delay: function() {
    return Math.floor(Math.random() * 300) + 200
  },
  errorRateTolerance: 0.2,
  delayWhenError: 1500
}