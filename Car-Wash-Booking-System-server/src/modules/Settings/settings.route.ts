import { Router } from "express";
import auth from "../../app/middlewares/auth";
import validateRequest from "../../app/middlewares/validateRequest";
import { SettingsController } from "./settings.controller";
import {
  adminUserRoleSchema,
  configQuerySchema,
  createRoleSchema,
  publicSettingsQuerySchema,
  resetSocietyConfigSchema,
  roleIdSchema,
  updateConfigSchema,
  updateRoleSchema,
} from "./settings.validation";

const router = Router();

router.get(
  "/public",
  validateRequest(publicSettingsQuerySchema),
  SettingsController.getPublicSettings,
);
router.get(
  "/me/access",
  auth("admin"),
  SettingsController.getMyAccess,
);
router.get(
  "/societies",
  auth("admin"),
  SettingsController.listSocieties,
);

router.get(
  "/roles",
  auth("admin"),
  SettingsController.listRoles,
);
router.post(
  "/roles",
  auth("admin"),
  validateRequest(createRoleSchema),
  SettingsController.createRole,
);
router.patch(
  "/roles/:id",
  auth("admin"),
  validateRequest(updateRoleSchema),
  SettingsController.updateRole,
);
router.delete(
  "/roles/:id",
  auth("admin"),
  validateRequest(roleIdSchema),
  SettingsController.deleteRole,
);

router.get(
  "/admin-users",
  auth("admin"),
  SettingsController.listAdminUsers,
);
router.patch(
  "/admin-users/:id/role",
  auth("admin"),
  validateRequest(adminUserRoleSchema),
  SettingsController.assignAdminRole,
);

router.get(
  "/config",
  auth("admin"),
  validateRequest(configQuerySchema),
  SettingsController.getConfig,
);
router.patch(
  "/config",
  auth("admin"),
  validateRequest(updateConfigSchema),
  SettingsController.updateConfig,
);
router.delete(
  "/config",
  auth("admin"),
  validateRequest(resetSocietyConfigSchema),
  SettingsController.resetSocietyConfig,
);

export const settingsRoute = router;
