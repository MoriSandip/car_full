import { Request, Response } from "express";
import { OfferServices } from "./offer.service";

const sendError = (res: Response, error: unknown) => {
  const err = error as Error & { code?: number };
  const message = err.message || "Something went wrong";
  const statusCode =
    err.code === 11000 ? 409 :
    /not found/i.test(message) ? 404 :
    /invalid|required|cannot exceed|must be|greater than/i.test(message) ? 400 : 500;
  return res.status(statusCode).json({ success: false, message });
};

const createOffer = async (req: Request, res: Response) => {
  try {
    const data = await OfferServices.createOffer(req.body);
    return res.status(201).json({ success: true, message: "Offer created successfully", data });
  } catch (error) {
    return sendError(res, error);
  }
};

const getOffers = async (req: Request, res: Response) => {
  try {
    const result = await OfferServices.getOffers(req.query);
    return res.status(200).json({
      success: true,
      message: "Offers fetched successfully",
      data: { result, total: result.length },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const getOffer = async (req: Request, res: Response) => {
  try {
    const data = await OfferServices.getOffer(req.params.id);
    return res.status(200).json({ success: true, message: "Offer fetched successfully", data });
  } catch (error) {
    return sendError(res, error);
  }
};

const updateOffer = async (req: Request, res: Response) => {
  try {
    const data = await OfferServices.updateOffer(req.params.id, req.body);
    return res.status(200).json({ success: true, message: "Offer updated successfully", data });
  } catch (error) {
    return sendError(res, error);
  }
};

const deleteOffer = async (req: Request, res: Response) => {
  try {
    const data = await OfferServices.deleteOffer(req.params.id);
    return res.status(200).json({ success: true, message: "Offer deleted successfully", data });
  } catch (error) {
    return sendError(res, error);
  }
};

const validateCoupon = async (req: Request, res: Response) => {
  try {
    const data = await OfferServices.validateCoupon(
      String(req.user.sub),
      String(req.body.planId),
      String(req.body.code),
    );
    return res.status(200).json({ success: true, message: "Coupon is valid", data });
  } catch (error) {
    return sendError(res, error);
  }
};

const getReferralSummary = async (req: Request, res: Response) => {
  try {
    const data = await OfferServices.getReferralSummary(String(req.user.sub));
    return res.status(200).json({ success: true, message: "Referral summary retrieved", data });
  } catch (error) {
    return sendError(res, error);
  }
};

const redeemReferralCode = async (req: Request, res: Response) => {
  try {
    const data = await OfferServices.redeemReferralCode(
      String(req.user.sub),
      String(req.body.code),
    );
    return res.status(200).json({ success: true, message: "Referral code applied", data });
  } catch (error) {
    return sendError(res, error);
  }
};

const getReferralList = async (_req: Request, res: Response) => {
  try {
    const { default: Referral } = await import("./referral.model");
    const data = await Referral.find()
      .populate("referrerId", "name email phone")
      .populate("referredId", "name email phone")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, message: "Referrals retrieved", data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const OfferControllers = {
  createOffer,
  getOffers,
  getOffer,
  updateOffer,
  deleteOffer,
  validateCoupon,
  getReferralSummary,
  redeemReferralCode,
  getReferralList,
};
