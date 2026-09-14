import mongoose from 'mongoose';
import connectToDatabase from './db.js';
import { enforceGlobalApiRateLimit } from './rateLimiter.js';
import { LabTopic, LabSection, LabTest, LabInterpretation } from '../_models/index.js';

export default async function handler(req, res) {
  if (!enforceGlobalApiRateLimit(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    await connectToDatabase();
    
    // Caching for public reads
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=3600');

    const { id, q } = req.query;

    if (id) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: 'ID chỉ số không hợp lệ' });
      }
      const test = await LabTest.findOne({ _id: id, status: 'published' }).lean();
      if (!test) {
        return res.status(404).json({ success: false, message: 'Lab test not found' });
      }
      test.interpretations = await LabInterpretation.find({ labTestId: id }).sort({ order: 1 }).lean();
      return res.status(200).json({ success: true, data: test });
    }

    if (q) {
      const keyword = String(q).trim();
      let queryCondition;
      
      // Use text search if query is long enough, fallback to regex
      if (keyword.length >= 3) {
        queryCondition = { $text: { $search: keyword } };
      } else {
        queryCondition = { searchText: { $regex: keyword, $options: 'i' } };
      }
      
      let tests;
      try {
        tests = await LabTest.find({
          status: 'published',
          ...queryCondition
        })
        .populate({
          path: 'sectionId',
          select: 'name topicId',
          populate: {
            path: 'topicId',
            select: 'name'
          }
        })
        .limit(50)
        .lean();
      } catch {
        // Fallback to regex if text index fails or not created
        tests = await LabTest.find({
          status: 'published',
          searchText: { $regex: keyword, $options: 'i' }
        })
        .populate({
          path: 'sectionId',
          select: 'name topicId',
          populate: {
            path: 'topicId',
            select: 'name'
          }
        })
        .limit(50)
        .lean();
      }
      
      // Group interpretations by labTestId for found tests
      const testIds = tests.map(t => t._id);
      const testInterpretations = await LabInterpretation.find({ labTestId: { $in: testIds } }).sort({ order: 1 }).lean();
      const interpMap = {};
      testInterpretations.forEach(interp => {
        const key = String(interp.labTestId);
        if (!interpMap[key]) interpMap[key] = [];
        interpMap[key].push(interp);
      });
      
      const formattedTests = tests.map(test => {
        const sectionName = test.sectionId?.name || '';
        const topicName = test.sectionId?.topicId?.name || '';
        return {
          ...test,
          sectionId: test.sectionId?._id || test.sectionId,
          topicName,
          sectionName,
          interpretations: interpMap[String(test._id)] || []
        };
      });

      return res.status(200).json({ success: true, data: formattedTests });
    }

    // Return full published tree: Topics -> Sections -> Tests
    const [topics, sections, tests, interpretations] = await Promise.all([
      LabTopic.find({ status: 'published' }).sort({ order: 1 }).lean(),
      LabSection.find({ status: 'published' }).sort({ order: 1 }).lean(),
      LabTest.find({ status: 'published' }).sort({ order: 1 }).lean(),
      LabInterpretation.find({}).sort({ order: 1 }).lean()
    ]);

    // Group interpretations by labTestId
    const interpMap = {};
    interpretations.forEach(interp => {
      const key = String(interp.labTestId);
      if (!interpMap[key]) interpMap[key] = [];
      interpMap[key].push(interp);
    });

    // Attach interpretations to tests
    tests.forEach(test => {
      test.interpretations = interpMap[String(test._id)] || [];
    });

    const topicsMap = {};
    topics.forEach(topic => {
      topicsMap[topic._id] = { ...topic, sections: [] };
    });

    const sectionsMap = {};
    sections.forEach(section => {
      sectionsMap[section._id] = { ...section, tests: [] };
      if (topicsMap[section.topicId]) {
        topicsMap[section.topicId].sections.push(sectionsMap[section._id]);
      }
    });

    tests.forEach(test => {
      if (sectionsMap[test.sectionId]) {
        sectionsMap[test.sectionId].tests.push(test);
      }
    });

    const tree = topics.map(t => topicsMap[t._id]).filter(t => t);
    
    return res.status(200).json({
      success: true,
      data: {
        topics: tree,
        lastPublishedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('API /lab-values Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
