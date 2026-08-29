import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  adminId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  action: { 
    type: String, 
    enum: ['CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'UNPUBLISH', 'IMPORT'], 
    required: true 
  },
  targetCollection: { 
    type: String, 
    enum: ['Subject', 'Deck', 'Question', 'User'],
    required: true 
  },
  targetId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  oldValues: { 
    type: mongoose.Schema.Types.Mixed, 
    default: null 
  },
  newValues: { 
    type: mongoose.Schema.Types.Mixed, 
    default: null 
  },
  ipAddress: { 
    type: String, 
    default: '' 
  }
}, { timestamps: true });

auditLogSchema.index({ targetCollection: 1, targetId: 1, createdAt: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
