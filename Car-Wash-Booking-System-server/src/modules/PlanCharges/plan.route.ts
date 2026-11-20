import express from "express";
import validateRequest from "../../app/middlewares/validateRequest";
import auth from "../../app/middlewares/auth";
import { USER_ROLE } from "../Auth/auth.constant";
import { PlanControllers } from "./plan.controller";
import { createPlanValidationSchema, updatePlanValidationSchema } from "./plan.validation";

const route = express.Router();

// Active plans are readable by customers so they can purchase memberships.
route.post("/", auth(USER_ROLE.admin), validateRequest(createPlanValidationSchema), PlanControllers.createPlan);
route.get("/", auth(USER_ROLE.admin, "CUSTOMER"), PlanControllers.getAllPlans);
route.get("/:id", auth(USER_ROLE.admin, "CUSTOMER"), PlanControllers.getSinglePlan);
route.use(auth(USER_ROLE.admin));
route.put("/:id", validateRequest(updatePlanValidationSchema), PlanControllers.updatePlan);
route.delete("/:id", PlanControllers.deletePlan);

export const planRoute = route;
