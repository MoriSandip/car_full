import httpStatus from "http-status";
import catchAsync from "../../app/utils/catchAsync";
import sendResponse from "../../app/utils/sendResponse";
import { SettingsService } from "./settings.service";

const getPublicSettings = catchAsync(async (req, res) => {
  const settings = await SettingsService.getPublicSettings(
    typeof req.query.societyId === "string" ? req.query.societyId : undefined,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Application settings retrieved.",
    data: settings,
  });
});

const getMyAccess = catchAsync(async (req, res) => {
  const access = await SettingsService.getMyAdminAccess(
    String(req.user?.userId ?? ""),
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Administrator access retrieved.",
    data: access,
  });
});

const listSocieties = catchAsync(async (_req, res) => {
  const societies = await SettingsService.listSocieties();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Societies retrieved.",
    data: societies,
  });
});

const listRoles = catchAsync(async (_req, res) => {
  const roles = await SettingsService.listRoles();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Administrator roles retrieved.",
    data: roles,
  });
});

const createRole = catchAsync(async (req, res) => {
  const role = await SettingsService.createRole(req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Administrator role created.",
    data: role,
  });
});

const updateRole = catchAsync(async (req, res) => {
  const role = await SettingsService.updateRole(req.params.id, req.body);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Administrator role updated.",
    data: role,
  });
});

const deleteRole = catchAsync(async (req, res) => {
  const role = await SettingsService.deleteRole(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Administrator role deleted.",
    data: role,
  });
});

const listAdminUsers = catchAsync(async (_req, res) => {
  const users = await SettingsService.listAdminUsers();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Administrator accounts retrieved.",
    data: users,
  });
});

const assignAdminRole = catchAsync(async (req, res) => {
  const user = await SettingsService.assignAdminRole(
    req.params.id,
    req.body.adminRoleId,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Administrator access updated.",
    data: user,
  });
});

const getConfig = catchAsync(async (req, res) => {
  const config = await SettingsService.getConfig(
    typeof req.query.societyId === "string" ? req.query.societyId : undefined,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Application configuration retrieved.",
    data: config,
  });
});

const updateConfig = catchAsync(async (req, res) => {
  const config = await SettingsService.updateConfig(
    req.body.societyId,
    req.body.settings,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Application configuration updated.",
    data: config,
  });
});

const resetSocietyConfig = catchAsync(async (req, res) => {
  const config = await SettingsService.resetSocietyConfig(
    String(req.query.societyId),
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Society settings reset to global defaults.",
    data: config,
  });
});

export const SettingsController = {
  getPublicSettings,
  getMyAccess,
  listSocieties,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  listAdminUsers,
  assignAdminRole,
  getConfig,
  updateConfig,
  resetSocietyConfig,
};
