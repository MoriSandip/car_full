import { baseApi } from "@/redux/api/baseApi";

export const permissionModules = [
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

export type PermissionModule = (typeof permissionModules)[number];
export type ModulePermission = { view: boolean; manage: boolean };
export type AdminPermissions = Record<PermissionModule, ModulePermission>;
export type AdminRole = {
  _id: string;
  name: string;
  description?: string;
  permissions: AdminPermissions;
  isActive: boolean;
  createdAt?: string;
};

export type AdminAccess = {
  isSuperAdmin: boolean;
  role: { _id: string; name: string } | null;
  permissions: AdminPermissions;
};

export type AdminAccount = {
  _id: string;
  name: string;
  email: string;
  userStatus: string;
  adminRoleId: string | { _id: string; name: string } | null;
};

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

export type AppConfiguration = {
  global: AppSettings;
  societyOverride: AppSettingsPatch | null;
  effective: AppSettings;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type ListResponse<T> = ApiResponse<T[]>;

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyAdminAccess: builder.query<ApiResponse<AdminAccess>, void>({
      query: () => ({ url: "/settings/me/access" }),
      providesTags: ["AdminAccess"],
    }),
    getSettingsSocieties: builder.query<
      ApiResponse<Array<{ _id: string; name: string; status: string }>>,
      void
    >({
      query: () => ({ url: "/settings/societies" }),
    }),
    getPublicAppSettings: builder.query<ApiResponse<AppSettings>, void>({
      query: () => ({ url: "/settings/public" }),
    }),
    getAdminRoles: builder.query<ListResponse<AdminRole>, void>({
      query: () => ({ url: "/settings/roles" }),
      providesTags: ["AdminRoles"],
    }),
    createAdminRole: builder.mutation<
      ApiResponse<AdminRole>,
      Pick<AdminRole, "name" | "description" | "permissions">
    >({
      query: (body) => ({ url: "/settings/roles", method: "POST", body }),
      invalidatesTags: ["AdminRoles"],
    }),
    updateAdminRole: builder.mutation<
      ApiResponse<AdminRole>,
      {
        id: string;
        body: Partial<Pick<AdminRole, "name" | "description" | "permissions" | "isActive">>;
      }
    >({
      query: ({ id, body }) => ({
        url: `/settings/roles/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["AdminRoles", "AdminUsers", "AdminAccess"],
    }),
    deleteAdminRole: builder.mutation<ApiResponse<AdminRole>, string>({
      query: (id) => ({ url: `/settings/roles/${id}`, method: "DELETE" }),
      invalidatesTags: ["AdminRoles"],
    }),
    getAdminAccounts: builder.query<ListResponse<AdminAccount>, void>({
      query: () => ({ url: "/settings/admin-users" }),
      providesTags: ["AdminUsers"],
    }),
    assignAdminRole: builder.mutation<
      ApiResponse<AdminAccount>,
      { id: string; adminRoleId: string | null }
    >({
      query: ({ id, adminRoleId }) => ({
        url: `/settings/admin-users/${id}/role`,
        method: "PATCH",
        body: { adminRoleId },
      }),
      invalidatesTags: ["AdminUsers", "AdminAccess"],
    }),
    getAppConfiguration: builder.query<
      ApiResponse<AppConfiguration>,
      string | void
    >({
      query: (societyId) => ({
        url: "/settings/config",
        params: societyId ? { societyId } : {},
      }),
      providesTags: ["AppSettings"],
    }),
    updateAppConfiguration: builder.mutation<
      ApiResponse<AppConfiguration>,
      { societyId?: string; settings: AppSettings }
    >({
      query: (body) => ({ url: "/settings/config", method: "PATCH", body }),
      invalidatesTags: ["AppSettings"],
    }),
    resetSocietyConfiguration: builder.mutation<
      ApiResponse<AppConfiguration>,
      string
    >({
      query: (societyId) => ({
        url: "/settings/config",
        method: "DELETE",
        params: { societyId },
      }),
      invalidatesTags: ["AppSettings"],
    }),
  }),
});

export const {
  useGetMyAdminAccessQuery,
  useGetSettingsSocietiesQuery,
  useGetPublicAppSettingsQuery,
  useGetAdminRolesQuery,
  useCreateAdminRoleMutation,
  useUpdateAdminRoleMutation,
  useDeleteAdminRoleMutation,
  useGetAdminAccountsQuery,
  useAssignAdminRoleMutation,
  useGetAppConfigurationQuery,
  useUpdateAppConfigurationMutation,
  useResetSocietyConfigurationMutation,
} = settingsApi;
