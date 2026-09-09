const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  const shouldApply = process.argv.includes('--apply');
  if (!process.env.MONGODB_URI) throw new Error('Thiếu MONGODB_URI.');
  const { createPublicQuestionId } = await import('../api/_utils/questionIdentity.js');
  const { getQuestionImageVariants } = await import('../api/_utils/imageUrl.js');
  await mongoose.connect(process.env.MONGODB_URI);
  const collection = mongoose.connection.collection('questions');
  const cursor = collection.find({}, { projection: { qId: 1, sourceQuestionId: 1, publicId: 1, deckPath: 1, image: 1 } });
  const operations = [];
  let scanned = 0;
  for await (const question of cursor) {
    scanned += 1;
    const publicId = question.publicId || createPublicQuestionId(question);
    const image = getQuestionImageVariants(question.image || {});
    const changed = publicId !== question.publicId
      || image.thumbnailUrl !== question.image?.thumbnailUrl
      || image.fullResUrl !== question.image?.fullResUrl;
    if (!changed) continue;
    operations.push({ updateOne: { filter: { _id: question._id }, update: { $set: { publicId, image } } } });
  }
  console.log(`Đã kiểm tra ${scanned} câu; cần cập nhật ${operations.length} câu.`);
  if (shouldApply && operations.length) {
    const result = await collection.bulkWrite(operations, { ordered: false });
    console.log(`Đã cập nhật ${result.modifiedCount} câu.`);
  } else if (!shouldApply) {
    console.log('Đây là bản xem trước. Thêm --apply để ghi dữ liệu.');
  }
}

main()
  .catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
