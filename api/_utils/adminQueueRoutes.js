import { AuditLog, Deck, Question, QuestionImport, QuestionIssue, QuestionRevision, Subject, User } from '../_models/index.js';
import { createPublicQuestionId } from './questionIdentity.js';
import { questionSnapshot } from './questionWorkflow.js';
import { enqueueN8nEvent } from './outbox.js';
function isObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ''));
}

async function issueViewData(filter) {
  const issues = await QuestionIssue.find(filter).sort({ reportCount: -1, updatedAt: -1 }).limit(300).lean();
  const reporterIds = [...new Set(issues.flatMap(item => [
    ...(item.reporterIds || []),
    ...(item.samples || []).map(sample => sample.reporterId)
  ]).filter(Boolean).map(String))];
  const [questions, decks, subjects, reporters, summaryRows] = await Promise.all([
    Question.find({ _id: { $in: issues.map(item => item.questionId).filter(Boolean) } })
      .select('question publicId type options correctOptionIds acceptedShortAnswers explanation image').lean(),
    Deck.find({ _id: { $in: issues.map(item => item.deckId).filter(Boolean) } }).select('title path').lean(),
    Subject.find({ _id: { $in: issues.map(item => item.subjectId).filter(isObjectId) } }).select('name').lean(),
    User.find({ _id: { $in: reporterIds.filter(isObjectId) } }).select('fullName').lean(),
    QuestionIssue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  ]);
  const questionMap = new Map(questions.map(item => [String(item._id), item]));
  const deckMap = new Map(decks.map(item => [String(item._id), item]));
  const subjectMap = new Map(subjects.map(item => [String(item._id), item]));
  const reporterMap = new Map(reporters.map(item => [String(item._id), { id: String(item._id), name: item.fullName || 'Người dùng' }]));
  const summary = { all: 0, open: 0, in_review: 0, resolved: 0, dismissed: 0 };
  summaryRows.forEach(row => { summary[row._id] = row.count; summary.all += row.count; });
  return {
    issues: issues.map(item => ({
      ...item,
      id: String(item._id),
      question: questionMap.get(String(item.questionId || '')),
      deck: deckMap.get(String(item.deckId || '')),
      subject: subjectMap.get(String(item.subjectId || '')),
      samples: (item.samples || []).slice().reverse().map(sample => ({
        ...sample,
        reporter: reporterMap.get(String(sample.reporterId || '')) || { name: 'Người dùng' }
      }))
    })),
    summary
  };
}

export async function issuesRoute(req, res, admin) {
  if (req.method === 'GET') {
    const filter = {};
    if (req.query.id) {
      if (!isObjectId(req.query.id)) return res.status(400).json({ success: false, message: 'ID báo lỗi không hợp lệ.' });
      filter._id = req.query.id;
    } else if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    const data = await issueViewData(filter);
    return res.json({ success: true, ...data });
  }
  if (req.method === 'PATCH') {
    if (!isObjectId(req.body?.id)) return res.status(400).json({ success: false, message: 'ID báo lỗi không hợp lệ.' });
    const issue = await QuestionIssue.findById(req.body.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Không tìm thấy báo lỗi.' });
    const oldValues = issue.toObject();
    const allowedStatuses = new Set(['open', 'in_review', 'resolved', 'dismissed']);
    const allowedPriorities = new Set(['low', 'normal', 'high', 'critical']);
    if (req.body.status !== undefined) {
      if (!allowedStatuses.has(req.body.status)) return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ.' });
      issue.status = req.body.status;
    }
    if (req.body.priority !== undefined) {
      if (!allowedPriorities.has(req.body.priority)) return res.status(400).json({ success: false, message: 'Mức ưu tiên không hợp lệ.' });
      issue.priority = req.body.priority;
    }
    if (req.body.resolutionNote !== undefined) issue.resolutionNote = String(req.body.resolutionNote || '').trim().slice(0, 2000);
    if (req.body.assignedTo !== undefined) issue.assignedTo = isObjectId(req.body.assignedTo) ? req.body.assignedTo : null;
    if (['resolved', 'dismissed'].includes(issue.status)) {
      if (!issue.resolutionNote) return res.status(400).json({ success: false, message: 'Cần ghi phản hồi trước khi khép báo lỗi.' });
      issue.resolvedAt = new Date();
      issue.resolvedBy = admin._id;
    } else {
      issue.resolvedAt = null;
      issue.resolvedBy = null;
      issue.resolvedQuestionRevision = null;
    }
    await issue.save();
    const changes = {
      status: issue.status, priority: issue.priority, resolutionNote: issue.resolutionNote,
      assignedTo: issue.assignedTo, resolvedAt: issue.resolvedAt, resolvedBy: issue.resolvedBy
    };
    await AuditLog.create({ adminId: admin._id, action: 'UPDATE', targetCollection: 'QuestionIssue', targetId: issue._id, oldValues, newValues: changes });
    await enqueueN8nEvent('QUESTION_ISSUE_UPDATED', { issueId: String(issue._id), status: issue.status });
    return res.json({ success: true, message: 'Đã cập nhật báo lỗi và phản hồi cho người dùng.', issue });
  }
  return res.status(405).json({ success: false, message: 'Phương thức không hỗ trợ.' });
}
export async function importsRoute(req,res,admin){if(req.method==='GET'){const imports=await QuestionImport.find({status:req.query.status||'pending'}).sort({detectedAt:-1}).limit(300).lean();return res.json({success:true,imports:imports.map(x=>({...x,id:String(x._id)}))})}const item=await QuestionImport.findById(req.body?.id);if(!item)return res.status(404).json({success:false,message:'Không tìm thấy thay đổi nguồn.'});const decision=req.body?.decision;if(decision==='dismiss')item.status='dismissed';else if(decision==='keep_database'){item.status='kept_database';if(item.questionId)await Question.updateOne({_id:item.questionId},{$set:{sourceHash:item.incomingHash,sourceSnapshot:item.sourceSnapshot,sourceState:'locally_edited'}})}else if(decision==='publish_source'){if(item.kind==='missing'){await Question.updateOne({_id:item.questionId},{$set:{archivedAt:new Date(),archivedReason:'Admin duyệt trạng thái thiếu trong nguồn',isPublished:false}})}else if(item.kind==='new'){const payload={...item.sourceSnapshot,deckId:item.deckId,deckPath:item.deckPath,sourceQuestionId:item.sourceQuestionId,sourceHash:item.incomingHash,sourceSnapshot:item.sourceSnapshot,sourceState:'synced',lastImportedAt:new Date()};payload.publicId=createPublicQuestionId(payload);item.questionId=(await Question.create(payload))._id}else{const current=await Question.findById(item.questionId);await QuestionRevision.create({questionId:current._id,revision:current.contentRevision||1,action:'IMPORT',snapshot:questionSnapshot(current),actorId:admin._id});Object.assign(current,item.sourceSnapshot,{sourceHash:item.incomingHash,sourceState:'synced',contentRevision:(current.contentRevision||1)+1});await current.save()}item.status='published'}else return res.status(400).json({success:false,message:'Quyết định không hợp lệ.'});item.reviewedAt=new Date();item.reviewedBy=admin._id;await item.save();await AuditLog.create({adminId:admin._id,action:'IMPORT',targetCollection:'QuestionImport',targetId:item._id,newValues:{decision}});return res.json({success:true,message:'Đã xử lý thay đổi nguồn.',item})}
export async function revisionsRoute(req,res,admin){if(req.method==='GET')return res.json({success:true,revisions:await QuestionRevision.find({questionId:req.query.questionId}).sort({revision:-1}).limit(30).lean()});const revision=await QuestionRevision.findById(req.body?.revisionId),current=revision&&await Question.findById(revision.questionId);if(!current)return res.status(404).json({success:false,message:'Không tìm thấy phiên bản.'});await QuestionRevision.create({questionId:current._id,revision:current.contentRevision||1,action:'RESTORE',snapshot:questionSnapshot(current),actorId:admin._id});Object.assign(current,revision.snapshot,{contentRevision:(current.contentRevision||1)+1,sourceState:'locally_edited',locallyEditedAt:new Date(),archivedAt:null});await current.save();await Deck.updateOne({_id:current.deckId},{$set:{updatedAt:new Date()}});return res.json({success:true,message:`Đã khôi phục bản ${revision.revision}.`})}
