
import { FilterQuery } from "mongoose";
import WashService from "./washService.model";
import { IWashService } from "./washService.interface";

type ListParams = {
  searchTerm?: string;
  page?: number;
  limit?: number;
  status?: string;
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createWashService = async (payload: IWashService) => {
  const name = payload.name.trim();

  const exists = await WashService.findOne({
    name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    isDeleted: false,
  });

  if (exists) {
    throw new Error("A wash service with this name already exists");
  }

  return WashService.create({ ...payload, name });
};

const getWashServices = async (params: ListParams) => {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));

  const filter: FilterQuery<IWashService> = {
    isDeleted: false,
  };

  if (
    params.status &&
    ["Active", "Inactive"].includes(params.status)
  ) {
    filter.status = params.status as IWashService["status"];
  }

  if (params.searchTerm?.trim()) {
    const term = escapeRegex(params.searchTerm.trim());

    filter.$or = [
      { name: { $regex: term, $options: "i" } },
      { description: { $regex: term, $options: "i" } },
    ];
  }

  const [data, total] = await Promise.all([
    WashService.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    WashService.countDocuments(filter),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const getWashServiceById = async (id: string) => {
  const service = await WashService.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!service) throw new Error("Wash service not found");

  return service;
};

const updateWashService = async (
  id: string,
  payload: Partial<IWashService>
) => {
  if (payload.name) {
    const exists = await WashService.findOne({
      _id: { $ne: id },
      name: {
        $regex: `^${escapeRegex(payload.name.trim())}$`,
        $options: "i",
      },
      isDeleted: false,
    });

    if (exists) {
      throw new Error("A wash service with this name already exists");
    }

    payload.name = payload.name.trim();
  }

  const updated = await WashService.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: payload },
    { new: true, runValidators: true }
  );

  if (!updated) throw new Error("Wash service not found");

  return updated;
};

const deleteWashService = async (id: string) => {
  const deleted = await WashService.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true, status: "Inactive" } },
    { new: true }
  );

  if (!deleted) throw new Error("Wash service not found");

  return deleted;
};

const getWashServiceStats = async () => {
  const [total, active, inactive] = await Promise.all([
    WashService.countDocuments({ isDeleted: false }),
    WashService.countDocuments({
      isDeleted: false,
      status: "Active",
    }),
    WashService.countDocuments({
      isDeleted: false,
      status: "Inactive",
    }),
  ]);

  return { total, active, inactive };
};

export const WashServiceService = {
  createWashService,
  getWashServices,
  getWashServiceById,
  updateWashService,
  deleteWashService,
  getWashServiceStats,
};
