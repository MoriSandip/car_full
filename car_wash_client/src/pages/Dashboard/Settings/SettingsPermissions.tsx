import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  permissionModules,
  type AdminAccount,
  type AdminPermissions,
  type AdminRole,
  type AppSettings,
  type ModulePermission,
  useAssignAdminRoleMutation,
  useCreateAdminRoleMutation,
  useDeleteAdminRoleMutation,
  useGetAdminAccountsQuery,
  useGetAdminRolesQuery,
  useGetAppConfigurationQuery,
  useGetMyAdminAccessQuery,
  useGetSettingsSocietiesQuery,
  useResetSocietyConfigurationMutation,
  useUpdateAdminRoleMutation,
  useUpdateAppConfigurationMutation,
} from "@/redux/features/settings/settingsApi";

type RoleDraft = {
  id?: string;
  name: string;
  description: string;
  permissions: AdminPermissions;
  isActive: boolean;
};

const moduleLabels: Record<(typeof permissionModules)[number], string> = {
  dashboard: "Dashboard",
  societies: "Society management",
  flats: "Flat management",
  cars: "Car management",
  customers: "Customer management",
  bookings: "Booking management",
  workers: "Worker management",
  attendancePayroll: "Attendance & payroll",
  services: "Services & slots",
  memberships: "Memberships & plans",
  payments: "Payments & transactions",
  offers: "Offers & referrals",
  reports: "Reports & analytics",
  inventory: "Inventory",
  support: "Complaints & support",
  users: "Admin accounts",
  settings: "Application settings",
};

const blankPermissions = (): AdminPermissions =>
  Object.fromEntries(
    permissionModules.map((module) => [
      module,
      { view: false, manage: false },
    ]),
  ) as AdminPermissions;

const errorMessage = (error: unknown) => {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = error.data;
    if (typeof data === "object" && data !== null && "message" in data) {
      if (typeof data.message === "string") return data.message;
    }
  }
  return error instanceof Error ? error.message : "Settings update failed.";
};

const roleIdOf = (user: AdminAccount) =>
  typeof user.adminRoleId === "string"
    ? user.adminRoleId
    : user.adminRoleId?._id ?? "";

const SettingsPermissions = () => {
  const accessQuery = useGetMyAdminAccessQuery();
  const access = accessQuery.data?.data;
  const isSuperAdmin = Boolean(access?.isSuperAdmin);
  const rolesQuery = useGetAdminRolesQuery(undefined, { skip: !isSuperAdmin });
  const usersQuery = useGetAdminAccountsQuery(undefined, { skip: !isSuperAdmin });
  const societiesQuery = useGetSettingsSocietiesQuery(undefined, {
    skip: !access?.permissions.settings.view && !access?.permissions.settings.manage && !isSuperAdmin,
  });
  const societies = societiesQuery.data?.data ?? [];
  const [selectedSocietyId, setSelectedSocietyId] = useState("");
  const canViewSettings =
    isSuperAdmin ||
    access?.permissions.settings.view ||
    access?.permissions.settings.manage;
  const canManageSettings =
    isSuperAdmin || access?.permissions.settings.manage;
  const configQuery = useGetAppConfigurationQuery(
    selectedSocietyId || undefined,
    { skip: !canViewSettings },
  );
  const [configForm, setConfigForm] = useState<AppSettings | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDraft, setRoleDraft] = useState<RoleDraft | null>(null);
  const [createRole, createRoleState] = useCreateAdminRoleMutation();
  const [updateRole, updateRoleState] = useUpdateAdminRoleMutation();
  const [deleteRole] = useDeleteAdminRoleMutation();
  const [assignRole] = useAssignAdminRoleMutation();
  const [saveConfiguration, saveConfigurationState] =
    useUpdateAppConfigurationMutation();
  const [resetConfiguration, resetConfigurationState] =
    useResetSocietyConfigurationMutation();
  const roles = rolesQuery.data?.data ?? [];
  const adminUsers = usersQuery.data?.data ?? [];
  const configuration = configQuery.data?.data;

  useEffect(() => {
    setConfigForm(configuration?.effective ?? null);
  }, [configuration, selectedSocietyId]);

  const openNewRole = () => {
    setRoleDraft({
      name: "",
      description: "",
      permissions: blankPermissions(),
      isActive: true,
    });
    setRoleDialogOpen(true);
  };

  const openRole = (role: AdminRole) => {
    setRoleDraft({
      id: role._id,
      name: role.name,
      description: role.description ?? "",
      permissions: role.permissions,
      isActive: role.isActive,
    });
    setRoleDialogOpen(true);
  };

  const saveRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roleDraft) return;
    const payload = {
      name: roleDraft.name.trim(),
      description: roleDraft.description.trim(),
      permissions: roleDraft.permissions,
      isActive: roleDraft.isActive,
    };
    try {
      if (roleDraft.id) {
        await updateRole({ id: roleDraft.id, body: payload }).unwrap();
        toast.success("Administrator role updated.");
      } else {
        await createRole(payload).unwrap();
        toast.success("Administrator role created.");
      }
      setRoleDialogOpen(false);
      setRoleDraft(null);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const removeRole = async (role: AdminRole) => {
    if (!window.confirm(`Delete the "${role.name}" role?`)) return;
    try {
      await deleteRole(role._id).unwrap();
      toast.success("Administrator role deleted.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const changeAdminRole = async (user: AdminAccount, value: string) => {
    try {
      await assignRole({
        id: user._id,
        adminRoleId: value === "__super_admin__" ? null : value,
      }).unwrap();
      toast.success(`Access updated for ${user.name || user.email}.`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!configForm || !configuration) return;
    try {
      await saveConfiguration({
        ...(selectedSocietyId ? { societyId: selectedSocietyId } : {}),
        settings: configForm,
      }).unwrap();
      toast.success(
        selectedSocietyId
          ? "Society settings saved."
          : "Global application settings saved.",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const resetSettings = async () => {
    if (!selectedSocietyId) return;
    try {
      await resetConfiguration(selectedSocietyId).unwrap();
      toast.success("Society settings now inherit global defaults.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const patchPermission = (
    module: keyof AdminPermissions,
    key: keyof ModulePermission,
    value: boolean,
  ) => {
    setRoleDraft((current) =>
      current
        ? {
            ...current,
            permissions: {
              ...current.permissions,
              [module]: { ...current.permissions[module], [key]: value },
            },
          }
        : current,
    );
  };

  const settingsForm = (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Application configuration</CardTitle>
            <CardDescription className="mt-1">
              Global defaults can be selectively overridden for each society.
              Booking policies are enforced by the server.
            </CardDescription>
          </div>
          <Select
            value={selectedSocietyId || "global"}
            onValueChange={(value) =>
              setSelectedSocietyId(value === "global" ? "" : value)
            }
          >
            <SelectTrigger className="w-full sm:w-64" aria-label="Settings scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global defaults</SelectItem>
              {societies.map((society) => (
                <SelectItem key={society._id} value={society._id}>
                  {society.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {configQuery.isLoading || !configForm ? (
          <p className="text-sm text-slate-500">Loading configuration...</p>
        ) : configQuery.isError ? (
          <p className="text-sm text-red-600">
            Configuration could not be loaded. Check your settings permission.
          </p>
        ) : (
          <form onSubmit={saveSettings} className="space-y-8">
            <section className="space-y-4">
              <h3 className="font-semibold text-slate-900">General</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="settings-app-name">Application name</Label>
                  <Input
                    id="settings-app-name"
                    value={configForm.general.appName}
                    maxLength={60}
                    disabled={!canManageSettings}
                    onChange={(event) =>
                      setConfigForm({
                        ...configForm,
                        general: {
                          ...configForm.general,
                          appName: event.target.value,
                        },
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-support-email">Support email</Label>
                  <Input
                    id="settings-support-email"
                    type="email"
                    value={configForm.general.supportEmail}
                    disabled={!canManageSettings}
                    onChange={(event) =>
                      setConfigForm({
                        ...configForm,
                        general: {
                          ...configForm.general,
                          supportEmail: event.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-support-phone">Support phone</Label>
                  <Input
                    id="settings-support-phone"
                    value={configForm.general.supportPhone}
                    maxLength={30}
                    disabled={!canManageSettings}
                    onChange={(event) =>
                      setConfigForm({
                        ...configForm,
                        general: {
                          ...configForm.general,
                          supportPhone: event.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900">Booking policy</h3>
                <p className="text-sm text-slate-500">
                  Cutoffs apply to customer and admin cancellations/rescheduling.
                  A value of zero disables the cutoff.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="max-advance-days">Maximum advance booking (days)</Label>
                  <Input
                    id="max-advance-days"
                    type="number"
                    min={1}
                    max={3650}
                    value={configForm.booking.maxAdvanceDays}
                    disabled={!canManageSettings}
                    onChange={(event) =>
                      setConfigForm({
                        ...configForm,
                        booking: {
                          ...configForm.booking,
                          maxAdvanceDays: Number(event.target.value),
                        },
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancel-cutoff">Cancellation cutoff (hours)</Label>
                  <Input
                    id="cancel-cutoff"
                    type="number"
                    min={0}
                    max={720}
                    value={configForm.booking.cancellationCutoffHours}
                    disabled={!canManageSettings}
                    onChange={(event) =>
                      setConfigForm({
                        ...configForm,
                        booking: {
                          ...configForm.booking,
                          cancellationCutoffHours: Number(event.target.value),
                        },
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reschedule-cutoff">Reschedule cutoff (hours)</Label>
                  <Input
                    id="reschedule-cutoff"
                    type="number"
                    min={0}
                    max={720}
                    value={configForm.booking.reschedulingCutoffHours}
                    disabled={!canManageSettings}
                    onChange={(event) =>
                      setConfigForm({
                        ...configForm,
                        booking: {
                          ...configForm.booking,
                          reschedulingCutoffHours: Number(event.target.value),
                        },
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="same-day-bookings"
                  checked={configForm.booking.allowSameDayBookings}
                  disabled={!canManageSettings}
                  onCheckedChange={(checked) =>
                    setConfigForm({
                      ...configForm,
                      booking: {
                        ...configForm.booking,
                        allowSameDayBookings: checked === true,
                      },
                    })
                  }
                />
                <Label htmlFor="same-day-bookings">
                  Allow same-day bookings
                </Label>
              </div>
            </section>

            {canManageSettings ? (
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                {selectedSocietyId && configuration?.societyOverride ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetSettings}
                    disabled={resetConfigurationState.isLoading}
                  >
                    Reset to global defaults
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  disabled={
                    saveConfigurationState.isLoading ||
                    resetConfigurationState.isLoading
                  }
                >
                  {saveConfigurationState.isLoading
                    ? "Saving..."
                    : "Save configuration"}
                </Button>
              </div>
            ) : null}
          </form>
        )}
      </CardContent>
    </Card>
  );

  if (accessQuery.isLoading) {
    return <div className="p-8 text-sm text-slate-500">Loading permissions...</div>;
  }
  if (accessQuery.isError || !access) {
    return (
      <div className="p-8 text-sm text-red-600">
        Administrator permissions could not be loaded.
      </div>
    );
  }
  if (!canViewSettings) {
    return (
      <div className="p-8 text-sm text-red-600">
        Your administrator role does not grant application settings access.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Settings & Permissions
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure booking behavior and manage role-based administrator access.
        </p>
        {access.role ? (
          <Badge className="mt-2">{access.role.name}</Badge>
        ) : (
          <Badge className="mt-2 bg-violet-700">
            <ShieldCheck className="mr-1 h-3.5 w-3.5" />
            Super Admin
          </Badge>
        )}
      </div>

      <Tabs defaultValue={isSuperAdmin ? "roles" : "configuration"}>
        <TabsList className="flex h-auto flex-wrap">
          {isSuperAdmin ? (
            <>
              <TabsTrigger value="roles">Roles & permissions</TabsTrigger>
              <TabsTrigger value="admins">Admin access</TabsTrigger>
            </>
          ) : null}
          <TabsTrigger value="configuration">Application settings</TabsTrigger>
        </TabsList>
        {isSuperAdmin ? (
          <>
            <TabsContent value="roles">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>Administrator roles</CardTitle>
                    <CardDescription className="mt-1">
                      Super Admin accounts retain full access. Custom roles use
                      explicit view and manage permissions.
                    </CardDescription>
                  </div>
                  <Button onClick={openNewRole}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create role
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rolesQuery.isLoading ? (
                    <p className="text-sm text-slate-500">Loading roles...</p>
                  ) : rolesQuery.isError ? (
                    <p className="text-sm text-red-600">Could not load roles.</p>
                  ) : roles.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No custom roles yet.
                    </p>
                  ) : (
                    roles.map((role) => (
                      <div
                        key={role._id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {role.name}
                            {!role.isActive ? (
                              <Badge variant="outline" className="ml-2">
                                Inactive
                              </Badge>
                            ) : null}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {role.description || "No description"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRole(role)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            aria-label={`Delete ${role.name}`}
                            onClick={() => removeRole(role)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admins">
              <Card>
                <CardHeader>
                  <CardTitle>Admin account access</CardTitle>
                  <CardDescription>
                    Unassigned accounts are Super Admins. Keep at least one
                    active Super Admin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {usersQuery.isLoading ? (
                    <p className="text-sm text-slate-500">
                      Loading administrator accounts...
                    </p>
                  ) : usersQuery.isError ? (
                    <p className="text-sm text-red-600">
                      Could not load administrator accounts.
                    </p>
                  ) : adminUsers.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No administrator accounts found.
                    </p>
                  ) : (
                    adminUsers.map((user) => (
                      <div
                        key={user._id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {user.name || user.email}
                          </p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                        <Select
                          value={roleIdOf(user) || "__super_admin__"}
                          onValueChange={(value) => changeAdminRole(user, value)}
                        >
                          <SelectTrigger
                            className="w-full sm:w-64"
                            aria-label={`Role for ${user.email}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__super_admin__">
                              Super Admin
                            </SelectItem>
                            {roles
                              .filter((role) => role.isActive)
                              .map((role) => (
                                <SelectItem key={role._id} value={role._id}>
                                  {role.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        ) : null}
        <TabsContent value="configuration">{settingsForm}</TabsContent>
      </Tabs>

      {roleDraft ? (
        <Dialog
          open={roleDialogOpen}
          onOpenChange={(open) => {
            setRoleDialogOpen(open);
            if (!open) setRoleDraft(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <form onSubmit={saveRole} className="space-y-5">
              <DialogHeader>
                <DialogTitle>
                  {roleDraft.id ? "Edit administrator role" : "Create administrator role"}
                </DialogTitle>
                <DialogDescription>
                  Manage is write access; it also permits viewing the module.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role-name">Role name</Label>
                  <Input
                    id="role-name"
                    value={roleDraft.name}
                    onChange={(event) =>
                      setRoleDraft({ ...roleDraft, name: event.target.value })
                    }
                    minLength={3}
                    maxLength={60}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-description">Description</Label>
                  <Input
                    id="role-description"
                    value={roleDraft.description}
                    onChange={(event) =>
                      setRoleDraft({
                        ...roleDraft,
                        description: event.target.value,
                      })
                    }
                    maxLength={250}
                  />
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="p-3">Module</th>
                      <th className="p-3 text-center">View</th>
                      <th className="p-3 text-center">Manage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissionModules.map((module) => (
                      <tr key={module} className="border-t">
                        <td className="p-3 font-medium">
                          {moduleLabels[module]}
                        </td>
                        {(["view", "manage"] as const).map((key) => (
                          <td key={key} className="p-3 text-center">
                            <Checkbox
                              aria-label={`${key} ${moduleLabels[module]}`}
                              checked={roleDraft.permissions[module][key]}
                              onCheckedChange={(checked) =>
                                patchPermission(module, key, checked === true)
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="role-active"
                  checked={roleDraft.isActive}
                  onCheckedChange={(checked) =>
                    setRoleDraft({ ...roleDraft, isActive: checked === true })
                  }
                />
                <Label htmlFor="role-active">Role is active</Label>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createRoleState.isLoading || updateRoleState.isLoading}
                >
                  {createRoleState.isLoading || updateRoleState.isLoading
                    ? "Saving..."
                    : "Save role"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
};

export default SettingsPermissions;
