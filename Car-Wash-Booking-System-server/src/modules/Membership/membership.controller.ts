
import { NextFunction, Request, Response } from "express";
import { MembershipServices } from "./membership.service";

const asyncHandler =
  (
    fn: (
      req: Request,
      res: Response,
      next: NextFunction
    ) => Promise<unknown>
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export const createMembership = asyncHandler(async (req, res) => {
  const result = await MembershipServices.createMembership(req.body);

  res.status(201).json({
    success: true,
    message: "Membership created successfully",
    data: result,
  });
});

export const createCustomerMembership = asyncHandler(async (req, res) => {
  const result = await MembershipServices.createCustomerMembership(
    String(req.user.sub),
    req.body,
  );
  res.status(201).json({
    success: true,
    message: "Membership created. Complete payment to activate it.",
    data: result,
  });
});

export const getCustomerPlansForCar = asyncHandler(async (req, res) => {
  const result = await MembershipServices.getCustomerPlansForCar(
    String(req.user.sub),
    String(req.query.carId ?? ""),
  );
  res.status(200).json({
    success: true,
    message: "Plans for your car retrieved successfully",
    data: result,
  });
});

export const getCustomerMemberships = asyncHandler(async (req, res) => {
  const result = await MembershipServices.getCustomerMemberships(
    String(req.user.sub),
  );
  res.status(200).json({
    success: true,
    message: "Your memberships retrieved successfully",
    data: result,
  });
});

export const getAllMemberships = asyncHandler(async (req, res) => {
  const result = await MembershipServices.getAllMemberships({
    search: req.query.search as string | undefined,
    status: req.query.status as any,
    paymentStatus: req.query.paymentStatus as any,
    societyId: req.query.societyId as string | undefined,
    flatId: req.query.flatId as string | undefined,
    carId: req.query.carId as string | undefined,
    planId: req.query.planId as string | undefined,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 10,
  });

  res.status(200).json({
    success: true,
    message: "Memberships retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const getMembershipStats = asyncHandler(async (_req, res) => {
  const result = await MembershipServices.getMembershipStats();

  res.status(200).json({
    success: true,
    message: "Membership statistics retrieved successfully",
    data: result,
  });
});

export const getSingleMembership = asyncHandler(async (req, res) => {
  const result = await MembershipServices.getSingleMembership(req.params.id);

  res.status(200).json({
    success: true,
    message: "Membership retrieved successfully",
    data: result,
  });
});

export const updateMembership = asyncHandler(async (req, res) => {
  const result = await MembershipServices.updateMembership(
    req.params.id,
    req.body
  );

  res.status(200).json({
    success: true,
    message: "Membership updated successfully",
    data: result,
  });
});

export const deleteMembership = asyncHandler(async (req, res) => {
  const result = await MembershipServices.deleteMembership(req.params.id);

  res.status(200).json({
    success: true,
    message: "Membership deleted successfully",
    data: result,
  });
});
