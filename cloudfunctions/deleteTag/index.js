const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const name = String(event.name || event.tag || '').trim()

  if (!name) {
    return fail('TAG_REQUIRED', 'tag name is required')
  }

  const found = await db.collection('user_tags').where({ owner_openid: wxContext.OPENID, name }).limit(1).get()
  if (found.data.length === 0) {
    return { ok: true, deleted: false }
  }

  await db.collection('user_tags').doc(found.data[0]._id).remove()
  return { ok: true, deleted: true }
}

function fail(code, message) {
  return { ok: false, code, message }
}
