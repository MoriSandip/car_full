import { Router } from "express";
import auth from "../../app/middlewares/auth";
import validateRequest from "../../app/middlewares/validateRequest";
import { ComplaintController } from "./complaint.controller";
import {
  adminComplaintListSchema,
  adminReplyToComplaintSchema,
  complaintIdSchema,
  createComplaintSchema,
  customerComplaintListSchema,
  replyToComplaintSchema,
  updateComplaintSchema,
} from "./complaint.validation";

const router = Router();

router.post(
  "/",
  auth("CUSTOMER"),
  validateRequest(createComplaintSchema),
  ComplaintController.createCustomerComplaint,
);
router.get(
  "/mine",
  auth("CUSTOMER"),
  validateRequest(customerComplaintListSchema),
  ComplaintController.getCustomerComplaints,
);
router.get(
  "/mine/:id",
  auth("CUSTOMER"),
  validateRequest(complaintIdSchema),
  ComplaintController.getCustomerComplaint,
);
router.post(
  "/mine/:id/replies",
  auth("CUSTOMER"),
  validateRequest(replyToComplaintSchema),
  ComplaintController.replyAsCustomer,
);

router.get(
  "/",
  auth("admin"),
  validateRequest(adminComplaintListSchema),
  ComplaintController.getAdminComplaints,
);
router.get(
  "/:id",
  auth("admin"),
  validateRequest(complaintIdSchema),
  ComplaintController.getAdminComplaint,
);
router.patch(
  "/:id",
  auth("admin"),
  validateRequest(updateComplaintSchema),
  ComplaintController.updateAdminComplaint,
);
router.post(
  "/:id/replies",
  auth("admin"),
  validateRequest(adminReplyToComplaintSchema),
  ComplaintController.replyAsAdmin,
);

export const complaintRoute = router;
