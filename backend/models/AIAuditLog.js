import mongoose from "mongoose";

const aiAuditLogSchema = new mongoose.Schema(
  {
    actorId: { type: String, required: true },
    actorRole: { type: String, enum: ['user', 'admin', 'system'], required: true },
    actorEmail: { type: String, required: true },
    action: { 
      type: String, 
      required: true,
      enum: [
        'cancel_booking_challenge_issued',
        'cancel_booking_confirmed',
        'cancel_booking_otp_failed',
        'delete_show_challenge_issued',
        'delete_show_confirmed',
        'delete_show_blocked_invariants',
        'delete_show_otp_failed',
        'blocked_destructive_intent',
        'unauthorized_tool_attempt'
      ]
    },
    targetType: { 
      type: String, 
      enum: ['booking', 'show', 'database', 'system'], 
      required: true 
    },
    targetId: { type: String, default: null },
    status: { 
      type: String, 
      enum: ['challenge_issued', 'success', 'blocked', 'rejected', 'failed'], 
      required: true 
    },
    reason: { type: String, default: '' },
    metadata: { type: Object, default: {} },
    ipAddress: { type: String, default: 'internal' }
  },
  { timestamps: true }
);

aiAuditLogSchema.index({ actorId: 1, createdAt: -1 });
aiAuditLogSchema.index({ action: 1, createdAt: -1 });
aiAuditLogSchema.index({ targetType: 1, targetId: 1 });

const AIAuditLog = mongoose.model("AIAuditLog", aiAuditLogSchema);

export default AIAuditLog;
