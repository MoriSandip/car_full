import { z } from "zod";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const createLeaveValidation = z.object({
  body: z.object({
    startDate: dateKey,
    endDate: dateKey,
    leaveType: z.enum(["Paid", "Unpaid"]),
    halfDay: z.boolean().optional(),
    reason: z.string().trim().min(1).max(1000),
  }),
});

export const reviewLeaveValidation = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    decision: z.enum(["Approved", "Rejected"]),
    leaveType: z.enum(["Paid", "Unpaid"]).optional(),
    reviewNote: z.string().trim().max(1000).optional(),
    reassignments: z.array(z.object({ bookingId: objectId, workerId: objectId })).optional(),
  }),
});

export const leaveIdValidation = z.object({
  params: z.object({ id: objectId }),
});

export const generatePayrollValidation = z.object({
  body: z.object({
    periodStart: dateKey,
    periodEnd: dateKey,
  }),
});

export const updatePayrollValidation = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    action: z.enum(["approve", "pay"]),
    paymentReference: z.string().trim().max(120).optional(),
  }),
});
