
import React, { useEffect, useState } from "react";

import {
  type TWorker,
  type TWorkerPayload,
  type TWorkerStatus,
} from "@/redux/features/worker/workerApi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import imageUpload from "@/utils/ImageUp";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TWorkerFormProps = {
  initialData?: TWorker | null;
  mode: "add" | "edit" | "view";
  loading?: boolean;
  onSubmit: (data: TWorkerPayload) => Promise<void> | void;
  onClose: () => void;
};

const defaultForm: TWorkerPayload = {
  name: "",
  email: "",
  phone: "",
  password: "",
  status: "ACTIVE",
  address: "",
  imageUrl: "",
};

const getErrorMessage = (error: any) =>
  error?.data?.message ||
  error?.message ||
  "Unable to save worker. Please try again.";

const WorkerForm: React.FC<TWorkerFormProps> = ({
  initialData,
  mode,
  loading = false,
  onSubmit,
  onClose,
}) => {
  const [form, setForm] = useState<TWorkerPayload>({
    ...defaultForm,
  });
  const [error, setError] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (!profileImage) {
      setProfilePreview(form.imageUrl || "");
      return;
    }
    const previewUrl = URL.createObjectURL(profileImage);
    setProfilePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [profileImage, form.imageUrl]);

  const isView = mode === "view";

  useEffect(() => {
    if (!initialData) {
      setForm({ ...defaultForm });
      setError("");
      setProfileImage(null);
      return;
    }

    setForm({
      name: initialData.name || "",
      email: initialData.email || "",
      phone: initialData.phone || "",
      password: "",
      status: initialData.status || "ACTIVE",
      address: initialData.address || "",
      imageUrl: initialData.imageUrl || "",
    });

    setError("");
    setProfileImage(null);
  }, [initialData, mode]);

  const updateField = <K extends keyof TWorkerPayload>(
    key: K,
    value: TWorkerPayload[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (!name || !email || !phone) {
      setError("Name, email and phone are required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (mode === "add" && (form.password || "").length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (mode === "edit" && form.password && form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    const payload: TWorkerPayload = {
      name,
      email,
      phone,
      status: form.status,
      address: form.address?.trim() || "",
      imageUrl: form.imageUrl || "",
    };

    if (mode === "add" || form.password) {
      payload.password = form.password;
    }

    try {
      if (profileImage) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(profileImage.type) ||
          profileImage.size > 5 * 1024 * 1024
        ) {
          setError("Choose a JPEG, PNG, or WebP profile photo up to 5 MB.");
          return;
        }
        setIsUploadingImage(true);
        const uploaded = await imageUpload(profileImage);
        payload.imageUrl = uploaded.data.url;
      }
      await onSubmit(payload);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="form-fields-grid grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="worker-name">Full Name *</Label>
          <Input
            id="worker-name"
            value={form.name}
            onChange={(event) =>
              updateField("name", event.target.value)
            }
            placeholder="Enter full name"
            disabled={isView}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="worker-email">Email *</Label>
          <Input
            id="worker-email"
            type="email"
            value={form.email}
            onChange={(event) =>
              updateField("email", event.target.value)
            }
            placeholder="worker@example.com"
            disabled={isView}
            autoCapitalize="none"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="worker-phone">Phone *</Label>
          <Input
            id="worker-phone"
            type="tel"
            value={form.phone}
            onChange={(event) =>
              updateField("phone", event.target.value)
            }
            placeholder="Enter phone number"
            disabled={isView}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="worker-password">
            Password {mode === "add" ? "*" : ""}
          </Label>
          <Input
            id="worker-password"
            type="password"
            value={form.password || ""}
            onChange={(event) =>
              updateField("password", event.target.value)
            }
            placeholder={
              mode === "edit"
                ? "Leave blank to keep current password"
                : "Minimum 8 characters"
            }
            minLength={8}
            disabled={isView}
            autoComplete="new-password"
            required={mode === "add"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="worker-profile-image">Profile photo</Label>
          <Input
            id="worker-profile-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={isView}
            onChange={(event) =>
              setProfileImage(event.target.files?.[0] ?? null)
            }
          />
          {profilePreview ? (
            <img
              src={profilePreview}
              alt={`${form.name || "Worker"} profile`}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Account Status *</Label>
          <Select
            value={form.status}
            onValueChange={(value) =>
              updateField("status", value as TWorkerStatus)
            }
            disabled={isView}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2 xl:col-span-3">
          <Label htmlFor="worker-address">Address</Label>
          <Textarea
            id="worker-address"
            value={form.address || ""}
            onChange={(event) =>
              updateField("address", event.target.value)
            }
            placeholder="Enter worker address"
            rows={3}
            disabled={isView}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          {isView ? "Close" : "Cancel"}
        </Button>

        {!isView && (
          <Button type="submit" disabled={loading || isUploadingImage}>
            {isUploadingImage
              ? "Uploading photo..."
              : loading
              ? "Saving..."
              : mode === "edit"
                ? "Update Worker"
                : "Register Worker"}
          </Button>
        )}
      </div>
    </form>
  );
};

export default WorkerForm;
