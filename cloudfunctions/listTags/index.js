const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const SYSTEM_TAGS = [
  '\u5feb\u624b',
  '\u4f4e\u8102',
  '\u4e0b\u996d',
  '\u5bb6\u5e38',
  '\u9ad8\u86cb\u767d',
  '\u9ebb\u8fa3',
  '\u6e05\u6de1',
  '\u996e\u54c1',
  '\u65e9\u9910',
  '\u751c\u53e3',
  '\u9999\u8fa3',
  '\u5fae\u8fa3',
  '\u9178\u8fa3',
  '\u9178\u751c',
  '\u54b8\u9999',
  '\u849c\u9999',
  '\u9c9c\u9999',
  '\u9002\u5408\u5e26\u996d',
  '\u513f\u7ae5\u53cb\u597d',
  '\u51b0\u7bb1\u6e05\u5e93\u5b58',
  '\u5c11\u6cb9',
  '\u7d20\u98df',
  '\u51cf\u8102',
  '\u4e00\u4eba\u98df',
  '\u6c64\u7fb9',
  '\u70d8\u7119',
  '\u5bb4\u5ba2',
  '\u6696\u80c3',
  '\u590f\u5929',
  '\u591c\u5bb5'
]

exports.main = async () => {
  const wxContext = cloud.getWXContext()
  const result = await db.collection('user_tags')
    .where({ owner_openid: wxContext.OPENID })
    .orderBy('updated_at', 'desc')
    .limit(100)
    .get()

  const customTags = result.data.map((tag) => tag.name).filter(Boolean)
  return {
    ok: true,
    system_tags: SYSTEM_TAGS,
    custom_tags: customTags,
    tags: Array.from(new Set(SYSTEM_TAGS.concat(customTags)))
  }
}
