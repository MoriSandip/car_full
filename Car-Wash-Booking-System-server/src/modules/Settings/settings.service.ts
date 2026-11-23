import { Types } from "mongoose";
import AppError from "../../app/errors/AppError";
import { User } from "../Auth/auth.model";
import { Society } from "../Society/society.model";
import { AdminRole } from "./adminRole.model";
import { AppSettingsRecord } from "./appSettings.model";
import {
  ADMIN_PERMISSION_MODULES,
  AdminPermissions,
  AppSettings,
  AppSettingsPatch,
  DEFAULT_APP_SETTINGS,
  emptyAdminPermissions,
  superAdminPermissions,
} from "./settings.constants";

const isSettingsEmpty = (settings: AppSettingsPatch) =>
  Object.keys(settings.general ?? {}).length === 0 &&
  Object.keys(settings.booking ?? {}).length === 0;

const mergeSettings = (
  base: AppSettings,
  patch?: AppSettingsPatch,
): AppSettings => ({
  general: { ...base.general, ...patch?.general },
  booking: { ...base.booking, ...patch?.booking },
});

const getGlobalSettings = async () => {
  const record = await AppSettingsRecord.findOneAndUpdate(
    { scopeKey: "global" },
    {
      $setOnInsert: {
        scopeKey: "global",
        societyId: null,
        settings: DEFAULT_APP_SETTINGS,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return mergeSettings(DEFAULT_APP_SETTINGS, record.settings);
};

const assertActiveSociety = async (societyId: string) => {
  if (!Types.ObjectId.isValid(societyId)) {
    throw new AppError(400, "A valid societyId is required.");
  }
  const society = await Society.findOne({
    _id: societyId,
    isDeleted: false,
  }).select("_id");
  if (!society) throw new AppError(404, "Society not found.");
};

const getConfig = async (societyId?: string) => {
  const global = await getGlobalSettings();
  if (!societyId) {
    return { global, societyOverride: null, effective: global };
  }

  await assertActiveSociety(societyId);
  const override = await AppSettingsRecord.findOne({
    scopeKey: `society:${societyId}`,
  }).lean();
  const societyOverride = override?.settings ?? null;
  return {
    global,
    societyOverride,
    effective: mergeSettings(global, societyOverride ?? undefined),
  };
};

const getPublicSettings = async (societyId?: string) => {
  const { effective } = await getConfig(societyId);
  return effective;
};

const updateConfig = async (
  societyId: string | undefined,
  settings: AppSettings,
) => {
  if (!societyId) {
    await AppSettingsRecord.updateOne(
      { scopeKey: "global" },
      {
        $set: { settings, societyId: null },
        $setOnInsert: { scopeKey: "global" },
      },
      { upsert: true, runValidators: true },
    );
    return getConfig();
  }

  await assertActiveSociety(societyId);
  const scopeKey = `society:${societyId}`;
  const global = await getGlobalSettings();
  const override: AppSettingsPatch = {};
  const general: NonNullable<AppSettingsPatch["general"]> = {};
  const booking: NonNullable<AppSettingsPatch["booking"]> = {};
  if (settings.general.appName !== global.general.appName) {
    general.appName = settings.general.appName;
  }
  if (settings.general.supportEmail !== global.general.supportEmail) {
    general.supportEmail = settings.general.supportEmail;
  }
  if (settings.general.supportPhone !== global.general.supportPhone) {
    general.supportPhone = settings.general.supportPhone;
  }
  if (
    settings.booking.allowSameDayBookings !==
    global.booking.allowSameDayBookings
  ) {
    booking.allowSameDayBookings = settings.booking.allowSameDayBookings;
  }
  if (settings.booking.maxAdvanceDays !== global.booking.maxAdvanceDays) {
    booking.maxAdvanceDays = settings.booking.maxAdvanceDays;
  }
  if (
    settings.booking.cancellationCutoffHours !==
    global.booking.cancellationCutoffHours
  ) {
    booking.cancellationCutoffHours =
      settings.booking.cancellationCutoffHours;
  }
  if (
    settings.booking.reschedulingCutoffHours !==
    global.booking.reschedulingCutoffHours
  ) {
    booking.reschedulingCutoffHours =
      settings.booking.reschedulingCutoffHours;
  }
  if (Object.keys(general).length > 0) override.general = general;
  if (Object.keys(booking).length > 0) override.booking = booking;
  if (isSettingsEmpty(override)) {
    await AppSettingsRecord.deleteOne({ scopeKey });
    return getConfig(societyId);
  }

  await AppSettingsRecord.updateOne(
    { scopeKey },
    {
      $set: { settings: override, societyId },
      $setOnInsert: { scopeKey },
    },
    { upsert: true, runValidators: true },
  );
  return getConfig(societyId);
};

const resetSocietyConfig = async (societyId: string) => {
  await assertActiveSociety(societyId);
  await AppSettingsRecord.deleteOne({ scopeKey: `society:${societyId}` });
  return getConfig(societyId);
};

const normalizedPermissions = (
  permissions?: Partial<AdminPermissions>,
): AdminPermissions => {
  const defaults = emptyAdminPermissions();
  for (const module of ADMIN_PERMISSION_MODULES) {
    defaults[module] = {
      view: Boolean(permissions?.[module]?.view),
      manage: Boolean(permissions?.[module]?.manage),
    };
  }
  return defaults;
};

const getMyAdminAccess = async (userId: string) => {
  const user = await User.findOne({ _id: userId, role: "admin" }).select(
    "adminRoleId",
  );
  if (!user) throw new AppError(404, "Administrator account not found.");
  if (!user.adminRoleId) {
    return {
      isSuperAdmin: true,
      role: null,
      permissions: superAdminPermissions(),
    };
  }
  const role = await AdminRole.findOne({
    _id: user.adminRoleId,
    isActive: true,
  }).select("name permissions");
  if (!role) {
    throw new AppError(403, "Your administrator role is inactive.");
  }
  return {
    isSuperAdmin: false,
    role: { _id: role._id, name: role.name },
    permissions: normalizedPermissions(role.permissions),
  };
};

const listSocieties = async () =>
  Society.find({ isDeleted: false })
    .select("name status")
    .sort({ name: 1 })
    .lean();

const listRoles = async () =>
  AdminRole.find().select("name description permissions isActive createdAt updatedAt").sort({
    name: 1,
  });

const createRole = async (payload: {
  name: string;
  description?: string;
  permissions: AdminPermissions;
}) => {
  const name = payload.name.trim();
  const nameKey = name.toLowerCase();
  if (nameKey === "super admin") {
    throw new AppError(400, "Super Admin is a reserved system role.");
  }
  if (await AdminRole.exists({ nameKey })) {
    throw new AppError(409, "A role with this name already exists.");
  }
  return AdminRole.create({
    name,
    nameKey,
    description: payload.description?.trim() ?? "",
    permissions: normalizedPermissions(payload.permissions),
  });
};

const updateRole = async (
  id: string,
  payload: {
    name?: string;
    description?: string;
    permissions?: AdminPermissions;
    isActive?: boolean;
  },
) => {
  const role = await AdminRole.findById(id);
  if (!role) throw new AppError(404, "Administrator role not found.");

  if (payload.name) {
    const name = payload.name.trim();
    const nameKey = name.toLowerCase();
    if (nameKey === "super admin") {
      throw new AppError(400, "Super Admin is a reserved system role.");
    }
    if (
      await AdminRole.exists({
        _id: { $ne: id },
        nameKey,
      })
    ) {
      throw new AppError(409, "A role with this name already exists.");
    }
    role.name = name;
    role.nameKey = nameKey;
  }
  if (payload.description !== undefined) {
    role.description = payload.description.trim();
  }
  if (payload.permissions) {
    role.permissions = normalizedPermissions(payload.permissions);
  }
  if (payload.isActive !== undefined) {
    if (!payload.isActive && (await User.exists({ adminRoleId: id }))) {
      throw new AppError(
        409,
        "Reassign administrators before deactivating this role.",
      );
    }
    role.isActive = payload.isActive;
  }
  await role.save();
  return role;
};

const deleteRole = async (id: string) => {
  if (await User.exists({ adminRoleId: id })) {
    throw new AppError(409, "Reassign administrators before deleting this role.");
  }
  const role = await AdminRole.findByIdAndDelete(id);
  if (!role) throw new AppError(404, "Administrator role not found.");
  return role;
};

const listAdminUsers = async () =>
  User.find({ role: "admin", isDeleted: { $ne: true } })
    .select("name email userStatus adminRoleId")
    .populate("adminRoleId", "name")
    .sort({ name: 1 })
    .lean();

const assignAdminRole = async (userId: string, adminRoleId: string | null) => {
  const user = await User.findOne({
    _id: userId,
    role: "admin",
    isDeleted: { $ne: true },
  });
  if (!user) throw new AppError(404, "Administrator account not found.");

  if (adminRoleId) {
    if (!Types.ObjectId.isValid(adminRoleId)) {
      throw new AppError(400, "Invalid administrator role.");
    }
    const role = await AdminRole.findOne({ _id: adminRoleId, isActive: true });
    if (!role) throw new AppError(404, "Active administrator role not found.");
    if (!user.adminRoleId) {
      const otherSuperAdmins = await User.countDocuments({
        _id: { $ne: user._id },
        role: "admin",
        isDeleted: { $ne: true },
        userStatus: { $nin: ["blocked", "block"] },
        adminRoleId: null,
      });
      if (otherSuperAdmins === 0) {
        throw new AppError(
          409,
          "At least one active Super Admin must remain in the system.",
        );
      }
    }
  } else if (user.adminRoleId) {
    const otherSuperAdmins = await User.countDocuments({
      _id: { $ne: user._id },
      role: "admin",
      isDeleted: { $ne: true },
      userStatus: { $nin: ["blocked", "block"] },
      adminRoleId: null,
    });
    if (otherSuperAdmins === 0) {
      throw new AppError(
        409,
        "At least one active Super Admin must remain in the system.",
      );
    }
  }

  user.adminRoleId = adminRoleId ? new Types.ObjectId(adminRoleId) : null;
  await user.save();
  return User.findById(user._id)
    .select("name email userStatus adminRoleId")
    .populate("adminRoleId", "name")
    .lean();
};

export const SettingsService = {
  getConfig,
  getPublicSettings,
  updateConfig,
  resetSocietyConfig,
  getMyAdminAccess,
  listSocieties,
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  listAdminUsers,
  assignAdminRole,
};
