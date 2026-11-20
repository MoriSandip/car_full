import express from "express";
import validateRequest from "../../app/middlewares/validateRequest";
import auth from "../../app/middlewares/auth";
import { USER_ROLE } from "../Auth/auth.constant";
import { WashServiceController } from "./washService.controller";
import {
  createWashServiceValidationSchema,
  updateWashServiceValidationSchema,
} from "./washService.validation";

const route = express.Router();

route.post(
  "/",
  auth(USER_ROLE.admin),
  validateRequest(createWashServiceValidationSchema),
  WashServiceController.create
);

route.get("/", auth(USER_ROLE.admin, "CUSTOMER"), WashServiceController.list);

// Keep /stats before /:id.
route.get("/stats", auth(USER_ROLE.admin), WashServiceController.stats);

route.get("/:id", auth(USER_ROLE.admin), WashServiceController.getOne);

route.put(
  "/:id",
  auth(USER_ROLE.admin),
  validateRequest(updateWashServiceValidationSchema),
  WashServiceController.update
);

route.delete("/:id", auth(USER_ROLE.admin), WashServiceController.remove);

export const washServiceRoute = route;
