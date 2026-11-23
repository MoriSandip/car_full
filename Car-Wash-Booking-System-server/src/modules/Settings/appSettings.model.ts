import { model, Schema } from "mongoose";
import { AppSettingsPatch } from "./settings.constants";

export type TAppSettingsRecord = {
  scopeKey: string;
  societyId: Schema.Types.ObjectId | null;
  settings: AppSettingsPatch;
};

const appSettingsSchema = new Schema<TAppSettingsRecord>(
  {
    scopeKey: { type: String, required: true, unique: true },
    societyId: {
      type: Schema.Types.ObjectId,
      ref: "Society",
      default: null,
    },
    settings: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const AppSettingsRecord = model<TAppSettingsRecord>(
  "AppSettings",
  appSettingsSchema,
);
