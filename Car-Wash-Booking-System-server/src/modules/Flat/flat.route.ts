import express from "express";
import validateRequest from "../../app/middlewares/validateRequest";
import auth from "../../app/middlewares/auth";
import { USER_ROLE } from "../Auth/auth.constant";
import { FlatControllers } from "./flat.controller";
import {
  createFlatValidationSchema,
  updateFlatValidationSchema,
  rejectFlatValidationSchema,
} from "./flat.validation";

const route = express.Router();

/**
 * CUSTOMER: Get logged-in customer's flats
 * GET /api/v1/flats/my
 */
route.get(
  "/my",
  auth("CUSTOMER"),
  FlatControllers.getMyFlats,
);

/**
 * CUSTOMER: Get verified flats for a selected society
 * GET /api/v1/flats/society/:societyId/verified
 *
 * IMPORTANT: Keep this before "/:id".
 */
route.get(
  "/society/:societyId/verified",
  auth("CUSTOMER"),
  FlatControllers.getVerifiedFlatsBySociety,
);

/**
 * ADMIN: Get pending flats for approval
 * GET /api/v1/flats/pending
 */
route.get(
  "/pending",
  auth(USER_ROLE.admin),
  (req, res, next) => {
    req.query.verificationStatus = "PENDING";
    next();
  },
  FlatControllers.getAllFlats,
);

/**
 * Create flat
 * POST /api/v1/flats
 */
route.post(
  "/",
  auth(USER_ROLE.admin, "CUSTOMER"),
  validateRequest(createFlatValidationSchema),
  FlatControllers.createFlat,
);

/**
 * ADMIN: Get all flats
 * GET /api/v1/flats
 */
route.get(
  "/",
  auth(USER_ROLE.admin),
  FlatControllers.getAllFlats,
);

/**
 * ADMIN: Verify flat
 * PATCH /api/v1/flats/:id/verify
 */
route.patch(
  "/:id/verify",
  auth(USER_ROLE.admin),
  FlatControllers.verifyFlat,
);

/**
 * ADMIN: Reject flat
 * PATCH /api/v1/flats/:id/reject
 */
route.patch(
  "/:id/reject",
  auth(USER_ROLE.admin),
  validateRequest(rejectFlatValidationSchema),
  FlatControllers.rejectFlat,
);

/**
 * Get single flat by ID
 * GET /api/v1/flats/:id
 */
route.get(
  "/:id",
  auth(USER_ROLE.admin, "CUSTOMER"),
  FlatControllers.getSingleFlat,
);

/**
 * Update flat
 * PUT /api/v1/flats/:id
 */
route.put(
  "/:id",
  auth(USER_ROLE.admin, "CUSTOMER"),
  validateRequest(updateFlatValidationSchema),
  FlatControllers.updateFlat,
);

/**
 * Delete flat
 * DELETE /api/v1/flats/:id
 */
route.delete(
  "/:id",
  auth(USER_ROLE.admin, "CUSTOMER"),
  FlatControllers.deleteFlat,
);

export const flatRoute = route;