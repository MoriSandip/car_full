import { Request, Response } from "express";
import { PlanServices } from "./plan.service";

const sendError = (res: Response, error: unknown) => {
  const err = error as Error & { code?: number };
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A plan with this name already exists in the selected Society.",
    });
  }
  const message = err.message || "Something went wrong";
  const statusCode =
    /not found/i.test(message) ? 404 :
    /invalid|required|cannot be negative|must be|at least|greater than|not verified/i.test(message) ? 400 : 500;
  return res.status(statusCode).json({ success: false, message });
};

const createPlan = async (req: Request, res: Response) => {
  try {
    const data = await PlanServices.createPlan(req.body);
    return res.status(201).json({ success: true, message: "Plan created successfully", data });
  } catch (error) { return sendError(res, error); }
};
const getAllPlans = async (req: Request, res: Response) => {
  try {
    const result = await PlanServices.getAllPlans({
      ...req.query,
      ...(req.user?.role === "CUSTOMER" ? { status: "Active" } : {}),
    });
    return res.status(200).json({ success: true, message: "Plans fetched successfully", data: { result, total: result.length } });
  } catch (error) { return sendError(res, error); }
};
const getSinglePlan = async (req: Request, res: Response) => {
  try {
    const data = await PlanServices.getSinglePlan(req.params.id);
    return res.status(200).json({ success: true, message: "Plan fetched successfully", data });
  } catch (error) { return sendError(res, error); }
};
const updatePlan = async (req: Request, res: Response) => {
  try {
    const data = await PlanServices.updatePlan(req.params.id, req.body);
    return res.status(200).json({ success: true, message: "Plan updated successfully", data });
  } catch (error) { return sendError(res, error); }
};
const deletePlan = async (req: Request, res: Response) => {
  try {
    const data = await PlanServices.deletePlan(req.params.id);
    return res.status(200).json({ success: true, message: "Plan deleted successfully", data });
  } catch (error) { return sendError(res, error); }
};

export const PlanControllers = { createPlan, getAllPlans, getSinglePlan, updatePlan, deletePlan };
