import { z } from "zod";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
} from "./complaint.model";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID.");
const message = z.string().trim().min(2).max(4000);

export const createComplaintSchema = z.object({
  body: z.object({
    category: z.enum(COMPLAINT_CATEGORIES),
    subject: z.string().trim().min(4).max(120),
    message,
    bookingId: objectId.optional(),
  }),
});

export const customerComplaintListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(COMPLAINT_STATUSES).optional(),
  }),
});

export const complaintIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export const replyToComplaintSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ message }),
});

export const adminReplyToComplaintSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    message,
    status: z.enum(COMPLAINT_STATUSES).optional(),
    priority: z.enum(COMPLAINT_PRIORITIES).optional(),
  }),
});

export const updateComplaintSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      status: z.enum(COMPLAINT_STATUSES).optional(),
      priority: z.enum(COMPLAINT_PRIORITIES).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, "Provide a status or priority."),
});

export const adminComplaintListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(COMPLAINT_STATUSES).optional(),
    category: z.enum(COMPLAINT_CATEGORIES).optional(),
    search: z.string().trim().max(100).optional(),
  }),
});
