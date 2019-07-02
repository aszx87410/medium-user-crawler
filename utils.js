module.exports = {
  // @see: https://stackoverflow.com/questions/44669073/regular-expression-to-match-and-split-on-chinese-comma-in-javascript/51941287#51941287
  isChinese: (text = '') => {
    const regex = /(\p{Script=Hani})+/gu;
    return text.match(regex)
  },

  // @see: https://gist.github.com/ryanmcgrath/982242
  isJapanese: (text = '') => {
    const regexJP = /[\u3040-\u309F]|[\u30A0-\u30FF]/g; 
    const jp = text.match(regexJP)

    // 大於三個日文才算數，避免有人喜歡加一些日文字母？
    if (jp && jp.length >= 3) {
      return true
    }
    return false
  },

  sleep: ms => new Promise(resolve => {
    setTimeout(resolve, ms)
  }),

  log: function () {
    const args = Array.prototype.slice.call(arguments);
    console.log.apply(console, args)
  }
}