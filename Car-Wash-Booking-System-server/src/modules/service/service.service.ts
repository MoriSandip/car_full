import httpStatus from 'http-status';
import { TService } from './service.interface';
import { Service } from './service.model';
import AppError from '../../app/errors/AppError';
import QueryBuilder from '../../app/builder/QueryBuilder';

const ProductSearchableFields = ['title', 'price', 'description'];

const createServiceIntoDB = async (payload: TService) => {
  const lastService = await Service.findOne()
    .sort({ id: -1 })
    .select('id')
    .lean();

  const nextId = (lastService?.id ?? 0) + 1;

  const result = await Service.create({
    ...payload,
    id: nextId,
  });

  return result;
};

const getAllServiceIntoDB = async (query: Record<string, unknown>) => {
  const ServiceQuery = new QueryBuilder(Service.find(), query)
    .search(ProductSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await ServiceQuery.modelQuery;
  const meta = await ServiceQuery.countTotal();

  return {
    meta,
    result,
  };
};

const getSingleServiceIntoDB = async (id: string) => {
  const result = await Service.findById(id);

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Service not found');
  }

  return result;
};

const updateServiceIntoDB = async (
  id: string,
  payload: Partial<TService>,
) => {
  const service = await Service.findById(id);

  if (!service) {
    throw new AppError(httpStatus.NOT_FOUND, 'Service not found');
  }

  const result = await Service.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteServiceIntoDB = async (id: string) => {
  const result = await Service.findByIdAndUpdate(
    id,
    { isDeleted: true },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Service not found');
  }

  return result;
};

export const ServiceServices = {
  createServiceIntoDB,
  getAllServiceIntoDB,
  getSingleServiceIntoDB,
  updateServiceIntoDB,
  deleteServiceIntoDB,
};