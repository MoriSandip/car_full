
import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

export interface ICustomer {
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  imageUrl?: string;
  role: "CUSTOMER";
  status: "ACTIVE" | "INACTIVE";
  referralCode?: string;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["CUSTOMER"],
      default: "CUSTOMER",
      immutable: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    referralCode: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

customerSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
});

export const Customer = model<ICustomer>(
  "Customer",
  customerSchema
);
