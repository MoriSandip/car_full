import express from "express";
import auth from "../../app/middlewares/auth";
import validateRequest from "../../app/middlewares/validateRequest";
import { USER_ROLE } from "../Auth/auth.constant";
import { SocietyControllers } from "./society.controller";
import { SocietyValidation } from "./society.validation";

const route = express.Router();

// ============================================
// CUSTOMER ROUTES — specific paths first
// ============================================

// Customer: societies submitted by logged-in customer
route.get(
  "/my",
  auth("CUSTOMER"),
  SocietyControllers.getMySocieties,
);

// ============================================
// ADMIN ROUTES
// ============================================

// Create society (admin only)
route.post(
  "/",
  auth(USER_ROLE.admin, "CUSTOMER"),
  validateRequest(SocietyValidation.createSocietySchema),
  SocietyControllers.createSociety,
);

// Get all societies
route.get(
  "/",
  auth(USER_ROLE.admin),
  SocietyControllers.getAllSociety,
);

// Verify society
route.patch(
  "/:id/verify",
  auth(USER_ROLE.admin),
  SocietyControllers.verifySociety,
);

// Reject society
route.patch(
  "/:id/reject",
  auth(USER_ROLE.admin),
  SocietyControllers.rejectSociety,
);

// Update society
route.put(
  "/:id",
  auth(USER_ROLE.admin),
  validateRequest(SocietyValidation.updateSocietySchema),
  SocietyControllers.updateSociety,
);

// Delete society
route.delete(
  "/:id",
  auth(USER_ROLE.admin),
  SocietyControllers.deleteSociety,
);

// Get single society — keep generic /:id after specific routes
route.get(
  "/:id",
  auth(USER_ROLE.admin),
  SocietyControllers.getSingleSociety,
);

export const societyRoute = route;