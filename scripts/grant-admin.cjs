const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  const phone = String(process.argv[2] || '').replace(/\D/g, '');
  if (!/^0\d{9}$/.test(phone)) throw new Error('Cách dùng: node scripts/grant-admin.cjs 0xxxxxxxxx');
  if (!process.env.MONGODB_URI) throw new Error('Thiếu MONGODB_URI.');
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await mongoose.connection.collection('users').updateOne(
    { phone },
    { $set: { role: 'admin', updatedAt: new Date() } }
  );
  if (!result.matchedCount) throw new Error('Không tìm thấy tài khoản cần cấp quyền.');
  console.log('Đã cấp quyền admin cho tài khoản kết thúc bằng ' + phone.slice(-4) + '.');
}

main()
  .catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
