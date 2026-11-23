import httpStatus from "http-status";
import catchAsync from "../../app/utils/catchAsync";
import sendResponse from "../../app/utils/sendResponse";
import { ComplaintService } from "./complaint.service";

const createCustomerComplaint = catchAsync(async (req, res) => {
  const ticket = await ComplaintService.createCustomerComplaint(
    String(req.user?.sub ?? ""),
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Support ticket created.",
    data: ticket,
  });
});

const getCustomerComplaints = catchAsync(async (req, res) => {
  const tickets = await ComplaintService.getCustomerComplaints(
    String(req.user?.sub ?? ""),
    {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      status:
        typeof req.query.status === "string" ? req.query.status : undefined,
    },
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Support tickets retrieved.",
    data: tickets,
  });
});

const getCustomerComplaint = catchAsync(async (req, res) => {
  const ticket = await ComplaintService.getCustomerComplaint(
    String(req.user?.sub ?? ""),
    req.params.id,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Support ticket retrieved.",
    data: ticket,
  });
});

const replyAsCustomer = catchAsync(async (req, res) => {
  const ticket = await ComplaintService.replyAsCustomer(
    String(req.user?.sub ?? ""),
    req.params.id,
    req.body.message,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Reply added.",
    data: ticket,
  });
});

const getAdminComplaints = catchAsync(async (req, res) => {
  const tickets = await ComplaintService.getAdminComplaints(
    {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      status:
        typeof req.query.status === "string" ? req.query.status : undefined,
      category:
        typeof req.query.category === "string"
          ? req.query.category
          : undefined,
      search:
        typeof req.query.search === "string" ? req.query.search : undefined,
    },
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Support tickets retrieved.",
    data: tickets,
  });
});

const getAdminComplaint = catchAsync(async (req, res) => {
  const ticket = await ComplaintService.getAdminComplaint(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Support ticket retrieved.",
    data: ticket,
  });
});

const replyAsAdmin = catchAsync(async (req, res) => {
  const ticket = await ComplaintService.replyAsAdmin(
    String(req.user?.sub ?? ""),
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Reply added.",
    data: ticket,
  });
});

const updateAdminComplaint = catchAsync(async (req, res) => {
  const ticket = await ComplaintService.updateAdminComplaint(
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Support ticket updated.",
    data: ticket,
  });
});

export const ComplaintController = {
  createCustomerComplaint,
  getCustomerComplaints,
  getCustomerComplaint,
  replyAsCustomer,
  getAdminComplaints,
  getAdminComplaint,
  replyAsAdmin,
  updateAdminComplaint,
};
