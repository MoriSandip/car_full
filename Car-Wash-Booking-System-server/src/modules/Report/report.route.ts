import { Router } from "express";
import auth from "../../app/middlewares/auth";
import { USER_ROLE } from "../Auth/auth.constant";
import { ReportController } from "./report.controller";

const route = Router();

route.get("/analytics", auth(USER_ROLE.admin), ReportController.analytics);
route.get("/bookings", auth(USER_ROLE.admin), ReportController.bookings);

export const reportRoute = route;