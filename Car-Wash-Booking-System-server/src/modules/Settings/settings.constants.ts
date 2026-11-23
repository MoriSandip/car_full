export const ADMIN_PERMISSION_MODULES = [
  "dashboard",
  "societies",
  "flats",
  "cars",
  "customers",
  "bookings",
  "workers",
  "attendancePayroll",
  "services",
  "memberships",
  "payments",
  "offers",
  "reports",
  "inventory",
  "support",
  "users",
  "settings",
] as const;

export type AdminPermissionModule =
  (typeof ADMIN_PERMISSION_MODULES)[number];

export type ModulePermission = {
  view: boolean;
  manage: boolean;
};

export type AdminPermissions = Record<
  AdminPermissionModule,
  ModulePermission
>;

export type AppSettings = {
  general: {
    appName: string;
    supportEmail: string;
    supportPhone: string;
  };
  booking: {
    allowSameDayBookings: boolean;
    maxAdvanceDays: number;
    cancellationCutoffHours: number;
    reschedulingCutoffHours: number;
  };
};

export type AppSettingsPatch = {
  general?: Partial<AppSettings["general"]>;
  booking?: Partial<AppSettings["booking"]>;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  general: {
    appName: "Car Wash",
    supportEmail: "",
    supportPhone: "",
  },
  booking: {
    allowSameDayBookings: true,
    maxAdvanceDays: 3650,
    cancellationCutoffHours: 0,
    reschedulingCutoffHours: 0,
  },
};

export const emptyAdminPermissions = (): AdminPermissions =>
  Object.fromEntries(
    ADMIN_PERMISSION_MODULES.map((module) => [
      module,
      { view: false, manage: false },
    ]),
  ) as AdminPermissions;

export const superAdminPermissions = (): AdminPermissions =>
  Object.fromEntries(
    ADMIN_PERMISSION_MODULES.map((module) => [
      module,
      { view: true, manage: true },
    ]),
  ) as AdminPermissions;

const routeModules: Array<[string, AdminPermissionModule]> = [
  ["/bookings/stats", "dashboard"],
  ["/workers/stats", "dashboard"],
  ["/societies", "societies"],
  ["/flats", "flats"],
  ["/cars", "cars"],
  ["/customers", "customers"],
  ["/bookings", "bookings"],
  ["/services", "services"],
  ["/slots", "services"],
  ["/wash-services", "services"],
  ["/plans", "memberships"],
  ["/memberships", "memberships"],
  ["/offers", "offers"],
  ["/payment", "payments"],
  ["/reports", "reports"],
  ["/inventory", "inventory"],
  ["/complaints", "support"],
  ["/user", "users"],
  ["/uploads", "users"],
  ["/workers/attendance", "attendancePayroll"],
  ["/workers/leaves", "attendancePayroll"],
  ["/workers/payroll", "attendancePayroll"],
  ["/workers", "workers"],
  ["/settings", "settings"],
];

export const adminPermissionForPath = (
  originalUrl: string,
): AdminPermissionModule | undefined => {
  const path = originalUrl.split("?")[0].replace(/^\/api\/v\d+/, "");
  const match = routeModules.find(
    ([prefix]) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return match?.[1];
};

export const isSuperAdminOnlyRequest = (
  method: string,
  originalUrl: string,
  body: unknown,
) => {
  const path = originalUrl.split("?")[0].replace(/^\/api\/v\d+/, "");
  if (
    path === "/auth/signup" ||
    path === "/settings/roles" ||
    path.startsWith("/settings/roles/") ||
    path === "/settings/admin-users" ||
    path.startsWith("/settings/admin-users/")
  ) {
    return true;
  }
  if (path.startsWith("/user/") && method === "PATCH") {
    return (
      typeof body === "object" &&
      body !== null &&
      "role" in body
    );
  }
  return false;
};
