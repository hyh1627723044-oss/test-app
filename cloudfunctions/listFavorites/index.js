const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const result = await db.collection('favorites')
    .where({ owner_openid: wxContext.OPENID })
    .orderBy('created_at', 'desc')
    .limit(50)
    .get()

  return { ok: true, favorites: result.data }
}
