import { z } from "zod";

const billingCycle = z.enum(["Monthly", "Quarterly", "Half-Yearly", "Yearly", "Custom"]);
const status = z.enum(["Active", "Inactive"]);
const services = z.array(z.string().trim().min(1).max(80)).min(1, "At least one service is required").max(30);

const planFields = {
  societyId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Society ID"),
  name: z.string().trim().min(1, "Plan name is required").max(80),
  description: z.string().trim().max(1000).optional().default(""),
  billingCycle: billingCycle.optional().default("Monthly"),
  price: z.coerce.number().finite().min(0, "Price cannot be negative"),
  includedWashes: z.coerce.number().int().min(0).default(0),
  validityDays: z.coerce.number().int().min(1, "Validity must be at least one day"),
  services,
  status: status.optional().default("Active"),
};

export const createPlanValidationSchema = z.object({
  body: z.object(planFields),
});

export const updatePlanValidationSchema = z.object({
  body: z.object({
    societyId: planFields.societyId.optional(),
    name: planFields.name.optional(),
    description: z.string().trim().max(1000).optional(),
    billingCycle: billingCycle.optional(),
    price: planFields.price.optional(),
    includedWashes: z.coerce.number().int().min(0).optional(),
    validityDays: planFields.validityDays.optional(),
    services: services.optional(),
    status: status.optional(),
  }).refine((body) => Object.keys(body).length > 0, "At least one field is required"),
});
