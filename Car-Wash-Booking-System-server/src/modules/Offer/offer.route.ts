import express from "express";
import auth from "../../app/middlewares/auth";
import validateRequest from "../../app/middlewares/validateRequest";
import { USER_ROLE } from "../Auth/auth.constant";
import { OfferControllers } from "./offer.controller";
import {
  createOfferValidationSchema,
  offerIdValidationSchema,
  updateOfferValidationSchema,
} from "./offer.validation";

const route = express.Router();
route.post("/", auth(USER_ROLE.admin), validateRequest(createOfferValidationSchema), OfferControllers.createOffer);
route.get("/", auth(USER_ROLE.admin, "CUSTOMER"), OfferControllers.getOffers);
route.get("/:id", auth(USER_ROLE.admin, "CUSTOMER"), validateRequest(offerIdValidationSchema), OfferControllers.getOffer);
route.use(auth(USER_ROLE.admin));
route.patch("/:id", validateRequest(updateOfferValidationSchema), OfferControllers.updateOffer);
route.delete("/:id", validateRequest(offerIdValidationSchema), OfferControllers.deleteOffer);

export const offerRoute = route;
