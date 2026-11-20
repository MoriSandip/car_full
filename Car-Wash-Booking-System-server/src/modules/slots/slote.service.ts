/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../app/errors/AppError';
import { Service } from '../service/service.model';
import { TSlots } from './slots.interface';
import { Slot } from './slots.model';
import WashService from '../WashService/washService.model';
import { getScheduledDateTime } from '../../app/utils/scheduledDateTime';

const createSlotIntoDB = async (payload: TSlots) => {
  const { service, date, startTime, endTime } = payload;

  const serviceData = await Service.findById(service);
  if (!serviceData) {
    throw new AppError(400, 'serviceId  not found');
  }
  if (serviceData.isDeleted) {
    throw new AppError(400, 'service is deleted');
  }
  let serviceDuration = 60;
  serviceDuration = serviceData?.duration;

  const generateTimeSlots = (
    startTime: string,
    endTime: string,
    duration: number,
  ) => {
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const minutesToTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60)
        .toString()
        .padStart(2, '0');
      const mins = (minutes % 60).toString().padStart(2, '0');
      return `${hours}:${mins}`;
    };

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const totalDuration = endMinutes - startMinutes;
    const numberOfSlots = totalDuration / duration;

    const slots = [];
    for (let i = 0; i < numberOfSlots; i++) {
      const slotStart = startMinutes + i * duration;
      const slotEnd = slotStart + duration;
      slots.push({
        service,
        date,
        startTime: minutesToTime(slotStart),
        endTime: minutesToTime(slotEnd),
        isBooked: 'available',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return slots;
  };

  const slots = generateTimeSlots(startTime, endTime, serviceDuration);
  const result = await Slot.create(slots);

  return result;
};

const createWashServiceSlotsIntoDB = async (payload: {
  washServiceId: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  startTime: string;
  endTime: string;
}) => {
  const washService = await WashService.findOne({
    _id: payload.washServiceId,
    status: 'Active',
    isDeleted: false,
  });

  if (!washService) {
    throw new AppError(404, 'Active wash service not found');
  }

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const minutesToTime = (minutes: number) =>
    `${Math.floor(minutes / 60)
      .toString()
      .padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;

  const startMinutes = timeToMinutes(payload.startTime);
  const endMinutes = timeToMinutes(payload.endTime);
  const duration = washService.durationMinutes;

  if (endMinutes <= startMinutes) {
    throw new AppError(400, 'End time must be after start time');
  }

  if (endMinutes - startMinutes < duration) {
    throw new AppError(
      400,
      'The selected time range is shorter than this service duration',
    );
  }

  const startDateValue = payload.startDate ?? payload.date;
  const endDateValue = payload.endDate ?? payload.date;
  if (!startDateValue || !endDateValue) {
    throw new AppError(400, 'Provide a slot date or a start and end date');
  }

  const startDate = new Date(`${startDateValue}T00:00:00.000Z`);
  const endDate = new Date(`${endDateValue}T00:00:00.000Z`);
  if (
    Number.isNaN(startDate.getTime()) ||
    startDate.toISOString().slice(0, 10) !== startDateValue ||
    Number.isNaN(endDate.getTime()) ||
    endDate.toISOString().slice(0, 10) !== endDateValue
  ) {
    throw new AppError(400, 'Invalid slot date range');
  }
  if (endDate < startDate) {
    throw new AppError(400, 'End date must be on or after start date');
  }

  const exclusiveEndDate = new Date(endDate);
  exclusiveEndDate.setUTCDate(exclusiveEndDate.getUTCDate() + 1);
  const existingSlots = await Slot.find({
    washServiceId: payload.washServiceId,
    date: { $gte: startDate, $lt: exclusiveEndDate },
    isDeleted: { $ne: true },
  })
    .select('date')
    .lean();
  if (existingSlots.length) {
    const conflictingDate = existingSlots[0].date.toISOString().slice(0, 10);
    throw new AppError(
      409,
      `Slots already exist for this wash service on ${conflictingDate}; no slots were created`,
    );
  }

  const slots: TSlots[] = [];
  for (
    const date = new Date(startDate);
    date <= endDate;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    for (
      let slotStart = startMinutes;
      slotStart + duration <= endMinutes;
      slotStart += duration
    ) {
      slots.push({
        washServiceId: washService._id,
        date: new Date(date),
        startTime: minutesToTime(slotStart),
        endTime: minutesToTime(slotStart + duration),
        isBooked: 'available',
        isDeleted: false,
      });
    }
  }

  return Slot.insertMany(slots);
};

//available slots

const getAvailableSlots = async (query: Record<string, unknown>) => {
  const { date, from, to, serviceId } = query;
  const queryObj: Record<string, unknown> = {
    isDeleted: { $ne: true },
  };
  if (date) {
    const startOfDay = new Date(`${String(date).slice(0, 10)}T00:00:00.000Z`);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    queryObj.date = { $gte: startOfDay, $lt: endOfDay };
  } else if (from || to) {
    const dateRange: Record<string, Date> = {};
    if (from) {
      dateRange.$gte = new Date(`${String(from).slice(0, 10)}T00:00:00.000Z`);
    }
    if (to) {
      dateRange.$lt = new Date(`${String(to).slice(0, 10)}T00:00:00.000Z`);
      dateRange.$lt.setUTCDate(dateRange.$lt.getUTCDate() + 1);
    }
    queryObj.date = dateRange;
  }
  if (serviceId) {
    queryObj.$or = [{ service: serviceId }, { washServiceId: serviceId }];
  }
  const result = await Slot.find(queryObj)
    .populate('service')
    .populate('washServiceId')
    .sort({ startTime: 1 })
    .exec();
  const now = Date.now();
  return result.filter(
    (slot) =>
      getScheduledDateTime(slot.date, slot.startTime).getTime() > now,
  );
};
const updateSlots = async (query: Record<string, unknown>, id: string) => {
  const slot = await Slot.findById(id);
  if (!slot) {
    throw new AppError(400, 'serviceId  not found');
  }
  if (slot.isDeleted) {
    throw new AppError(400, 'service is deleted');
  }

  const result = await Slot.findByIdAndUpdate(id, query, {
    new: true,
    runValidators: true,
  });

  return result;
};
export const SlotService = {
  createSlotIntoDB,
  createWashServiceSlotsIntoDB,
  getAvailableSlots,
  updateSlots,
};
