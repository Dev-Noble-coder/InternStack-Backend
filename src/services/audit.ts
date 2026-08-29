import { AuditLog } from "../models";
export const createAuditLog = (
  action: string,
  performedBy: any,
  targetType: string,
  targetId: any,
  metadata?: object,
) => AuditLog.create({ action, performedBy, targetType, targetId, metadata });
