import { z } from "zod";

const societyFields = {
  name: z.string().trim().min(1, "Society name is required"),
  address: z.string().trim().min(1, "Address is required"),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().optional(),
  pincode: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional(),
  description: z.string().optional(),
};

const createSocietySchema = z.object({
  body: z.object(societyFields),
});

const updateSocietySchema = z.object({
  body: z.object({
    name: societyFields.name.optional(),
    address: societyFields.address.optional(),
    city: societyFields.city.optional(),
    state: societyFields.state,
    pincode: societyFields.pincode,
    contactPerson: societyFields.contactPerson,
    phone: societyFields.phone,
    email: societyFields.email,
    description: societyFields.description,
  }),
});

export const SocietyValidation = {
  createSocietySchema,
  updateSocietySchema,
};