import { z } from "zod";
import { ADMIN_PERMISSION_MODULES } from "./settings.constants";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID.");
const modulePermission = z
  .object({ view: z.boolean(), manage: z.boolean() })
  .strict();

const permissions = z
  .object({
    dashboard: modulePermission,
    societies: modulePermission,
    flats: modulePermission,
    cars: modulePermission,
    customers: modulePermission,
    bookings: modulePermission,
    workers: modulePermission,
    attendancePayroll: modulePermission,
    services: modulePermission,
    memberships: modulePermission,
    payments: modulePermission,
    offers: modulePermission,
    reports: modulePermission,
    inventory: modulePermission,
    support: modulePermission,
    users: modulePermission,
    settings: modulePermission,
  })
  .strict();

const generalSettings = z
  .object({
    appName: z.string().trim().min(2).max(60),
    supportEmail: z
      .string()
      .trim()
      .max(254)
      .refine((value) => !value || z.email().safeParse(value).success),
    supportPhone: z.string().trim().max(30),
  })
  .strict();

const bookingSettings = z
  .object({
    allowSameDayBookings: z.boolean(),
    maxAdvanceDays: z.number().int().min(1).max(3650),
    cancellationCutoffHours: z.number().int().min(0).max(720),
    reschedulingCutoffHours: z.number().int().min(0).max(720),
  })
  .strict();

const appSettingsSchema = z
  .object({
    general: generalSettings,
    booking: bookingSettings,
  })
  .strict();

export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().trim().min(3).max(60),
    description: z.string().trim().max(250).optional(),
    permissions,
  }),
});

export const updateRoleSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: z.string().trim().min(3).max(60).optional(),
      description: z.string().trim().max(250).optional(),
      permissions: permissions.optional(),
      isActive: z.boolean().optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0),
});

export const roleIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export const adminUserRoleSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ adminRoleId: objectId.nullable() }).strict(),
});

export const configQuerySchema = z.object({
  query: z.object({ societyId: objectId.optional() }),
});

export const publicSettingsQuerySchema = z.object({
  query: z.object({ societyId: objectId.optional() }),
});

export const updateConfigSchema = z.object({
  body: z
    .object({
      societyId: objectId.optional(),
      settings: appSettingsSchema,
    })
    .strict(),
});

export const resetSocietyConfigSchema = z.object({
  query: z.object({ societyId: objectId }),
});

export const permissionModules = ADMIN_PERMISSION_MODULES;
