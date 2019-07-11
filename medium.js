const axios = require('axios')
const _ = require('lodash')
const utils = require('./utils')
const JSON_HIJACKING_PREFIX = '])}while(1);</x>'

// wrapper function, return null instead of throwing error
async function getMediumResponse(url) {
  try {
    const response = await axios.get(url)
    const json = JSON.parse(response.data.replace(JSON_HIJACKING_PREFIX, ''))
    return json
  } catch(err) {
    return null
  }
}

function isMandarinUser(name, bio, posts) {

  // if bio or name is japanese, must be japanese
  if (utils.isJapanese(name) || utils.isJapanese(bio)) {
    return false
  }

   // this user has no activity on medium, decide by name and bio
  if (!posts) {
    return utils.isChinese(name) || utils.isChinese(bio)
  }

  const contents = _.values(posts).map(item => item.title + _.get(item, 'content.subtitle'))
  return Boolean(
    contents.find(item => {
      return utils.isChinese(item) && !utils.isJapanese(item)
    })
  )
}

module.exports = {
  getFollowers: async (uid, to) => {
    let url = `https://medium.com/_/api/users/${uid}/profile/stream?source=followers&limit=200`
    if (to) {
      url += '&to=' + to
    }
    const json = await getMediumResponse(url)
    if (!json) {
      return null
    }
    const followers = _.keys(json.payload.references.Social) || []
    const nextTo = _.get(json, 'payload.paging.next.to')
    return {
      followers,
      nextTo
    }
  },

  getUserInfo: async (uid) => {
    const url = `https://medium.com/_/api/users/${uid}/profile/stream`
    const json = await getMediumResponse(url)
    if (!json) {
      return {}
    }
    const userId = _.get(json, 'payload.user.userId')
    const follower = _.get(json, `payload.references.SocialStats.${userId}.usersFollowedByCount`, 0)

    const posts = _.get(json, 'payload.references.Post')
    const name = _.get(json, 'payload.user.name')
    const bio = _.get(json, 'payload.user.bio')

    return {
      isMandarinUser: isMandarinUser(name, bio, posts),
      userId,
      name,
      username: _.get(json, 'payload.user.username'),
      bio,
      followerCount: follower,
      mediumMemberAt: _.get(json, 'payload.user.mediumMemberAt'),
      isWriterProgramEnrolled: _.get(json, 'payload.user.isWriterProgramEnrolled'),
      createdAt: _.get(json, 'payload.user.createdAt'),
    }
  },

  getPosts: async (uid, to) => {
    let url = `https://medium.com/_/api/users/${uid}/profile/stream?source=overview&limit=25`
    if (to) {
      url += '&to=' + to
    }
    const json = await getMediumResponse(url)
    if (!json) {
      return null
    }
    const postIds = _.keys(json.payload.references.Post) || []
    const posts = postIds.map(id => json.payload.references.Post[id])
    const nextTo = _.get(json, 'payload.paging.next.to')
    return {
      posts,
      nextTo
    }
  }
}