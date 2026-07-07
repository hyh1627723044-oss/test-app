const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const name = String(event.name || event.tag || '').trim()

  if (!name) {
    return fail('TAG_REQUIRED', 'tag name is required')
  }

  const now = new Date()
  const found = await db.collection('user_tags').where({ owner_openid: wxContext.OPENID, name }).limit(1).get()
  if (found.data.length > 0) {
    await db.collection('user_tags').doc(found.data[0]._id).update({ data: { updated_at: now } })
    return { ok: true, id: found.data[0]._id, name }
  }

  const created = await db.collection('user_tags').add({
    data: {
      owner_openid: wxContext.OPENID,
      name,
      use_count: 0,
      created_at: now,
      updated_at: now
    }
  })

  return { ok: true, id: created._id, name }
}

function fail(code, message) {
  return { ok: false, code, message }
}
