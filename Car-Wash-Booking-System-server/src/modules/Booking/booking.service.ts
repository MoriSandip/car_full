import { FilterQuery, Types } from 'mongoose';
import Booking from './booking.model';
import Membership from '../Membership/membership.model';
import WashService from '../WashService/washService.model';
import { Car } from '../Car/car.model';
import { Society } from '../Society/society.model';
import Flat from '../Flat/flat.model';
import { IBooking } from './booking.interface';
import { Worker } from '../Worker/worker.model';
import { Slot } from '../slots/slots.model';
import { TSlots } from '../slots/slots.interface';
import { NotificationService } from '../Notification/notification.service';
import { getScheduledDateTime } from '../../app/utils/scheduledDateTime';
import AppError from '../../app/errors/AppError';
import { SettingsService } from '../Settings/settings.service';

type ListParams = {
  searchTerm?: string;
  page?: number;
  limit?: number;
  status?: string;
  paymentType?: string;
  societyId?: string;
  from?: string;
  to?: string;
  toExclusive?: string;
  customerId?: string;
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type TCustomerSlotRequest = {
  customerId?: string;
  slotId?: string;
  serviceId: string;
  bookingTime: string;
};

const reserveCustomerSlot = async (
  data: TCustomerSlotRequest,
  bookingDate: Date,
) => {
  if (!data.customerId && !data.slotId) return null;
  if (!data.slotId || !Types.ObjectId.isValid(data.slotId)) {
    throw new Error('Choose an available time slot');
  }

  const startOfDay = new Date(bookingDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  const slot = await Slot.findOneAndUpdate(
    {
      _id: data.slotId,
      washServiceId: data.serviceId,
      date: { $gte: startOfDay, $lt: endOfDay },
      startTime: data.bookingTime,
      isBooked: 'available',
      isDeleted: { $ne: true },
    },
    { $set: { isBooked: 'booked' } },
    { new: true },
  );

  if (!slot) {
    throw new Error(
      'This time slot is no longer available. Choose another slot',
    );
  }
  return slot;
};

const releaseSlot = async (slotId?: Types.ObjectId | string) => {
  if (!slotId) return;
  await Slot.updateOne(
    { _id: slotId, isBooked: 'booked' },
    { $set: { isBooked: 'available' } },
  );
};

const validateFutureSchedule = (bookingDate: Date, bookingTime: string) => {
  const scheduledAt = getScheduledDateTime(bookingDate, bookingTime);

  if (scheduledAt.getTime() < Date.now()) {
    throw new AppError(400, 'Booking date and time cannot be in the past');
  }
};

const indiaDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: 'year' | 'month' | 'day') =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const validateConfiguredBookingWindow = async (
  societyId: Types.ObjectId | string,
  bookingDate: Date,
) => {
  const settings = await SettingsService.getPublicSettings(String(societyId));
  const bookingDateKey = bookingDate.toISOString().slice(0, 10);
  const todayKey = indiaDateKey(new Date());
  const daysAhead =
    (Date.parse(`${bookingDateKey}T00:00:00.000Z`) -
      Date.parse(`${todayKey}T00:00:00.000Z`)) /
    86_400_000;

  if (daysAhead === 0 && !settings.booking.allowSameDayBookings) {
    throw new AppError(400, 'Same-day bookings are currently disabled.');
  }
  if (daysAhead > settings.booking.maxAdvanceDays) {
    throw new AppError(
      400,
      `Bookings can be made up to ${settings.booking.maxAdvanceDays} days in advance.`,
    );
  }

  return settings;
};

const validateConfiguredCancellationWindow = async (
  societyId: Types.ObjectId | string,
  bookingDate: Date,
  bookingTime: string,
) => {
  const settings = await SettingsService.getPublicSettings(String(societyId));
  if (settings.booking.cancellationCutoffHours === 0) return;
  const scheduledAt = getScheduledDateTime(bookingDate, bookingTime);
  const cutoffMs = settings.booking.cancellationCutoffHours * 3_600_000;
  if (scheduledAt.getTime() - Date.now() <= cutoffMs) {
    throw new AppError(
      400,
      'This booking is inside the cancellation cutoff window.',
    );
  }
};

const createBooking = async (data: any) => {
  const [car, society, flat, service] = await Promise.all([
    Car.findOne({
      _id: data.carId,
      isDeleted: false,
    }),
    Society.findOne({
      _id: data.societyId,
      isDeleted: false,
    }),
    Flat.findOne({
      _id: data.flatId,
      societyId: data.societyId,
      isDeleted: false,
    }),
    WashService.findOne({
      _id: data.serviceId,
      isDeleted: false,
      status: 'Active',
    }),
  ]);

  if (!car) throw new Error('Car not found or inactive');
  if (!society) throw new Error('Society not found');
  if (!flat) throw new Error('Flat not found');
  if (society.status !== 'VERIFIED') {
    throw new Error('Selected Society is not verified by admin yet');
  }

  if (!service) {
    throw new Error('Wash service not found or inactive');
  }

  if (String(car.societyId) !== String(data.societyId)) {
    throw new Error('Car does not belong to selected society');
  }

  if (String(car.flatId) !== String(data.flatId)) {
    throw new Error('Car does not belong to selected flat');
  }

  if (data.customerId) {
    if (
      String(car.createdBy) !== String(data.customerId) ||
      car.createdByRole !== 'CUSTOMER'
    ) {
      throw new Error('You can only book a wash for your own car');
    }

    if (car.verificationStatus !== 'VERIFIED') {
      throw new Error('Your car must be verified before booking a wash');
    }

    if (car.status !== 'Active') {
      throw new Error('Your car must be active before booking a wash');
    }
  }

  const bookingDate = new Date(data.bookingDate);

  if (Number.isNaN(bookingDate.getTime())) {
    throw new Error('Invalid booking date');
  }
  validateFutureSchedule(bookingDate, data.bookingTime);
  await validateConfiguredBookingWindow(
    data.societyId,
    bookingDate,
  );

  const baseBooking = {
    ...data,
    bookingDate,
    serviceNameSnapshot: service.name,
    servicePriceSnapshot: Number(service.price),
    remarks: data.remarks ?? '',
  };

  if (data.paymentType === 'Membership') {
    const membership = await Membership.findOne({
      _id: data.membershipId,
      carId: data.carId,
      societyId: data.societyId,
      flatId: data.flatId,
      status: 'Active',
      paymentStatus: 'Paid',
      isDeleted: false,
      startDate: { $lte: bookingDate },
      endDate: { $gte: bookingDate },
    });

    if (!membership) {
      throw new Error('No active membership matches this car and booking date');
    }

    const assignedWorker = membership.workerId
      ? await Worker.findOne({
        _id: membership.workerId,
        status: 'ACTIVE',
      })
      : null;
    if (membership.workerId && !assignedWorker) {
      throw new Error(
        'The worker assigned to this membership is inactive. Ask admin to assign an active worker before booking.',
      );
    }

    const allowance = Math.max(0, Number(membership.includedWashes ?? 0));
    const bookingDateKey = bookingDate.toISOString().slice(0, 10);
    const startOfBookingDate = new Date(bookingDate);
    startOfBookingDate.setUTCHours(0, 0, 0, 0);
    const endOfBookingDate = new Date(startOfBookingDate);
    endOfBookingDate.setUTCDate(endOfBookingDate.getUTCDate() + 1);
    const existingWash = await Booking.exists({
      membershipId: membership._id,
      bookingDate: { $gte: startOfBookingDate, $lt: endOfBookingDate },
      status: { $ne: 'Cancelled' },
      isDeleted: false,
    });
    if (
      existingWash ||
      membership.usedBookingDates?.includes(bookingDateKey) ||
      membership.reservedBookingDates?.includes(bookingDateKey)
    ) {
      throw new Error('This membership already has a wash booked for this date');
    }

    const reservedMembership = await Membership.findOneAndUpdate(
      {
        _id: membership._id,
        status: 'Active',
        paymentStatus: 'Paid',
        reservedBookingDates: { $ne: bookingDateKey },
        usedBookingDates: { $ne: bookingDateKey },
        $expr: {
          $lt: [
            {
              $add: [
                { $ifNull: ['$usedWashes', 0] },
                { $ifNull: ['$reservedWashes', 0] },
              ],
            },
            allowance,
          ],
        },
      },
      {
        $inc: { reservedWashes: 1 },
        $addToSet: { reservedBookingDates: bookingDateKey },
      },
      { new: true },
    );

    if (!reservedMembership) {
      throw new Error('No membership washes remaining');
    }

    let reservedSlot: Awaited<ReturnType<typeof reserveCustomerSlot>> = null;
    try {
      reservedSlot = await reserveCustomerSlot(data, bookingDate);
      const booking = await Booking.create({
        ...baseBooking,
        ...(reservedSlot ? { slotId: reservedSlot._id } : {}),
        paymentType: 'Membership',
        amountPayable: 0,
        paymentStatus: 'Paid',
        status: 'Confirmed',
        ...(assignedWorker
          ? {
              workerId: membership.workerId,
              assignedAt: membership.assignedAt ?? new Date(),
              assignedBy: membership.assignedBy,
            }
          : {}),
      });
      return booking;
    } catch (error) {
      await releaseSlot(reservedSlot?._id);
      await Membership.updateOne(
        {
          _id: membership._id,
          reservedWashes: { $gt: 0 },
        },
        {
          $inc: { reservedWashes: -1 },
          $pull: { reservedBookingDates: bookingDateKey },
        },
      );

      throw error;
    }
  }

  const reservedSlot = await reserveCustomerSlot(data, bookingDate);
  try {
    return await Booking.create({
      ...baseBooking,
      ...(reservedSlot ? { slotId: reservedSlot._id } : {}),
      paymentType: 'Individual',
      membershipId: undefined,
      paymentMethod: data.paymentMethod ?? 'Stripe',
      ...(data.paymentMethod === 'Cash'
        ? { cashCollectionStatus: 'NotRecorded' }
        : {}),
      amountPayable: Number(service.price),
      paymentStatus: 'Pending',
      status: 'Pending',
    });
  } catch (error) {
    await releaseSlot(reservedSlot?._id);
    throw error;
  }
};

const getBookings = async (params: ListParams) => {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));

  const filter: FilterQuery<IBooking> = {
    isDeleted: false,
  };

  if (params.customerId) {
    filter.customerId = params.customerId;
  }

  if (
    params.status &&
    ['Pending', 'Confirmed', 'InProgress', 'Completed', 'Cancelled'].includes(
      params.status,
    )
  ) {
    filter.status = params.status as any;
  }

  if (
    params.paymentType &&
    ['Membership', 'Individual'].includes(params.paymentType)
  ) {
    filter.paymentType = params.paymentType as any;
  }

  if (params.societyId && Types.ObjectId.isValid(params.societyId)) {
    filter.societyId = params.societyId as any;
  }

  if (params.from || params.to || params.toExclusive) {
    const dateFilter: Record<string, Date> = {};

    if (params.from) dateFilter.$gte = new Date(params.from);
    if (params.toExclusive) {
      dateFilter.$lt = new Date(params.toExclusive);
    } else if (params.to) {
      dateFilter.$lte = new Date(params.to);
    }

    (filter as any).bookingDate = dateFilter;
  }

  if (params.searchTerm?.trim()) {
    const term = escapeRegex(params.searchTerm.trim());

    filter.$or = [
      {
        serviceNameSnapshot: {
          $regex: term,
          $options: 'i',
        },
      },
      {
        bookingTime: {
          $regex: term,
          $options: 'i',
        },
      },
      {
        remarks: {
          $regex: term,
          $options: 'i',
        },
      },
    ];
  }

  const [data, total] = await Promise.all([
    Booking.find(filter)
      .populate('carId')
      .populate('societyId')
      .populate('flatId')
      .populate('serviceId')
      .populate('slotId')
      .populate('membershipId')
      .populate('workerId', 'name email phone status imageUrl')
      .sort({ bookingDate: -1, bookingTime: 1 })
      .skip((page - 1) * limit)
      .limit(limit),

    Booking.countDocuments(filter),
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

const getBookingById = async (id: string, customerId?: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error('Invalid booking ID');
  }

  const booking = await Booking.findOne({
    _id: id,
    isDeleted: false,
    ...(customerId ? { customerId } : {}),
  })
    .populate('carId')
    .populate('societyId')
    .populate('flatId')
    .populate('serviceId')
    .populate('slotId')
    .populate('membershipId')
    .populate('workerId', 'name email phone status imageUrl');

  if (!booking) throw new Error('Booking not found');

  return booking;
};

const updateBooking = async (
  id: string,
  payload: any,
  customerId?: string,
) => {
  const booking = await Booking.findOne({
    _id: id,
    isDeleted: false,
    ...(customerId ? { customerId } : {}),
  });

  if (!booking) throw new Error('Booking not found');

  if (['Completed', 'Cancelled'].includes(booking.status)) {
    throw new Error('Completed or cancelled bookings cannot be edited');
  }

  const nextDate = payload.bookingDate
    ? new Date(payload.bookingDate)
    : new Date(booking.bookingDate);
  const nextTime = payload.bookingTime ?? booking.bookingTime;
  const scheduleChanged =
    nextDate.getTime() !== new Date(booking.bookingDate).getTime() ||
    nextTime !== booking.bookingTime ||
    (payload.slotId && String(payload.slotId) !== String(booking.slotId ?? ''));

  if (!scheduleChanged) {
    const updated = await Booking.findOneAndUpdate(
      { _id: id, isDeleted: false, ...(customerId ? { customerId } : {}) },
      { $set: { ...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}) } },
      { new: true, runValidators: true },
    );
    if (!updated) throw new Error('Booking not found');
    return updated;
  }

  if (booking.status === 'InProgress' || booking.workStatus !== 'NotStarted') {
    throw new Error('A started booking cannot be rescheduled');
  }
  if (Number.isNaN(nextDate.getTime())) {
    throw new Error('Invalid booking date');
  }
  validateFutureSchedule(nextDate, nextTime);
  const bookingSettings = await validateConfiguredBookingWindow(
    booking.societyId,
    nextDate,
  );
  const currentSchedule = getScheduledDateTime(
    new Date(booking.bookingDate),
    booking.bookingTime,
  );
  const reschedulingCutoff = bookingSettings.booking.reschedulingCutoffHours;
  if (
    reschedulingCutoff > 0 &&
    currentSchedule.getTime() - Date.now() <= reschedulingCutoff * 3_600_000
  ) {
    throw new AppError(
      400,
      'This booking is inside the rescheduling cutoff window.',
    );
  }

  let membershipDateChange:
    | { membershipId: Types.ObjectId; oldDateKey: string; nextDateKey: string }
    | undefined;
  if (
    booking.paymentType === 'Membership' &&
    booking.membershipId
  ) {
    const oldDateKey = new Date(booking.bookingDate).toISOString().slice(0, 10);
    const nextDateKey = nextDate.toISOString().slice(0, 10);
    const membership = await Membership.findOne({
      _id: booking.membershipId,
      carId: booking.carId,
      status: 'Active',
      paymentStatus: 'Paid',
      isDeleted: false,
      startDate: { $lte: nextDate },
      endDate: { $gte: nextDate },
    });
    if (!membership) {
      throw new Error('Rescheduled date is outside the active membership period');
    }
    if (oldDateKey !== nextDateKey) {
      const nextDayStart = new Date(nextDate);
      nextDayStart.setUTCHours(0, 0, 0, 0);
      const nextDayEnd = new Date(nextDayStart);
      nextDayEnd.setUTCDate(nextDayEnd.getUTCDate() + 1);
      const existingWash = await Booking.exists({
        _id: { $ne: booking._id },
        membershipId: booking.membershipId,
        bookingDate: { $gte: nextDayStart, $lt: nextDayEnd },
        status: { $ne: 'Cancelled' },
        isDeleted: false,
      });
      if (
        existingWash ||
        membership.usedBookingDates?.includes(nextDateKey) ||
        membership.reservedBookingDates?.includes(nextDateKey)
      ) {
        throw new Error('This membership already has a wash booked for this date');
      }

      const movedReservation = await Membership.updateOne(
        {
          _id: membership._id,
          status: 'Active',
          paymentStatus: 'Paid',
          reservedWashes: { $gt: 0 },
          reservedBookingDates: { $ne: nextDateKey },
          usedBookingDates: { $ne: nextDateKey },
        },
        {
          $pull: { reservedBookingDates: oldDateKey },
          $addToSet: { reservedBookingDates: nextDateKey },
        },
      );
      if (!movedReservation.modifiedCount) {
        throw new Error('Membership wash reservation could not be moved');
      }
      membershipDateChange = {
        membershipId: membership._id,
        oldDateKey,
        nextDateKey,
      };
    }
  }

  const restoreMembershipDate = async () => {
    if (!membershipDateChange) return;
    await Membership.updateOne(
      { _id: membershipDateChange.membershipId },
      {
        $pull: { reservedBookingDates: membershipDateChange.nextDateKey },
        $addToSet: { reservedBookingDates: membershipDateChange.oldDateKey },
      },
    );
  };

  const startOfDay = new Date(nextDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
  const slotQuery: FilterQuery<TSlots> = {
    washServiceId: booking.serviceId,
    date: { $gte: startOfDay, $lt: endOfDay },
    startTime: nextTime,
    isBooked: 'available',
    isDeleted: { $ne: true },
  };
  if (payload.slotId) slotQuery._id = payload.slotId;
  const nextSlot = await Slot.findOneAndUpdate(
    slotQuery,
    { $set: { isBooked: 'booked' } },
    { new: true },
  );
  if (!nextSlot) {
    await restoreMembershipDate();
    throw new Error('The requested reschedule time is no longer available');
  }

  let updated: IBooking | null;
  try {
    updated = await Booking.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
        ...(customerId ? { customerId } : {}),
        status: { $nin: ['Completed', 'Cancelled', 'InProgress'] },
        workStatus: 'NotStarted',
      },
      {
        $set: {
          bookingDate: nextDate,
          bookingTime: nextTime,
          slotId: nextSlot._id,
          ...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
        },
      },
      { new: true, runValidators: true },
    );
    if (!updated) throw new Error('Booking could not be rescheduled');
  } catch (error) {
    await releaseSlot(nextSlot._id);
    await restoreMembershipDate();
    throw error;
  }
  await releaseSlot(booking.slotId);
  if (booking.customerId) {
    void NotificationService.sendCustomerNotification(
      booking.customerId,
      'CarWash booking rescheduled',
      `Your booking is now scheduled for ${nextDate.toLocaleDateString()} at ${nextTime}.`,
    );
  }
  return updated;
};

const submitBookingReview = async (
  id: string,
  customerId: string,
  rating: number,
  review = '',
) => {
  if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(customerId)) {
    throw new Error('Invalid booking or customer ID');
  }

  const updated = await Booking.findOneAndUpdate(
    {
      _id: id,
      customerId: new Types.ObjectId(customerId),
      status: 'Completed',
      isDeleted: false,
      customerRating: { $exists: false },
    },
    {
      $set: { customerRating: rating, customerReview: review, reviewedAt: new Date() },
    },
    { new: true, runValidators: true },
  );
  if (updated) return updated;

  const booking = await Booking.findOne({
    _id: id,
    customerId: new Types.ObjectId(customerId),
    isDeleted: false,
  }).select('status customerRating');
  if (!booking) throw new Error('Booking not found');
  if (booking.status !== 'Completed') {
    throw new Error('Only completed bookings can be reviewed');
  }
  throw new Error('A review has already been submitted for this booking');
};

const changeBookingStatus = async (id: string, payload: any) => {
  const booking = await Booking.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!booking) throw new Error('Booking not found');

  if (['Completed', 'Cancelled'].includes(booking.status)) {
    throw new Error('Completed or cancelled bookings are final');
  }

  const nextStatus = payload.status;

  if (!['Pending', 'Confirmed', 'InProgress', 'Completed', 'Cancelled'].includes(nextStatus)) {
    throw new Error('Invalid booking status');
  }

  if (nextStatus !== booking.status) {
    const allowedTransition =
      (booking.status === 'Pending' &&
        ['Confirmed', 'Cancelled'].includes(nextStatus)) ||
      (booking.status === 'Confirmed' && nextStatus === 'Cancelled');

    if (!allowedTransition) {
      throw new Error(
        'Only workers can start or complete bookings; invalid status transition',
      );
    }
  }

  if (nextStatus === 'Cancelled' && booking.workStatus !== 'NotStarted') {
    throw new Error('Started bookings cannot be cancelled by an admin');
  }
  if (nextStatus === 'Cancelled') {
    await validateConfiguredCancellationWindow(
      booking.societyId,
      new Date(booking.bookingDate),
      booking.bookingTime,
    );
  }

  const update: Record<string, unknown> = {
    status: nextStatus,
  };

  if (payload.paymentStatus) {
    update.paymentStatus = payload.paymentStatus;
  }

  if (payload.remarks !== undefined) {
    update.remarks = payload.remarks;
  }

  const updated = await Booking.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false,
      status: booking.status,
      ...(nextStatus === 'Cancelled' ? { workStatus: 'NotStarted' } : {}),
    },
    { $set: update },
    { new: true, runValidators: true },
  );

  if (!updated) {
    throw new Error('Booking status changed; reload and try again');
  }

  if (nextStatus === 'Cancelled') {
    if (
      booking.paymentType === 'Membership' &&
      booking.membershipId
    ) {
      const reservation = await Membership.updateOne(
        {
          _id: booking.membershipId,
          reservedWashes: { $gt: 0 },
        },
        {
          $inc: { reservedWashes: -1 },
          $pull: {
            reservedBookingDates: new Date(booking.bookingDate)
              .toISOString()
              .slice(0, 10),
          },
        },
      );

      if (!reservation.modifiedCount) {
        await Booking.updateOne(
          { _id: booking._id, status: 'Cancelled', isDeleted: false },
          { $set: { status: booking.status } },
        );
        throw new Error(
          'Membership reservation not found; booking cannot be cancelled',
        );
      }
    } else if (booking.paymentType === 'Membership') {
      await Booking.updateOne(
        { _id: booking._id, status: 'Cancelled', isDeleted: false },
        { $set: { status: booking.status } },
      );
      throw new Error('Membership booking is missing its membership');
    }

    await releaseSlot(booking.slotId);
  }
  if (updated && nextStatus !== booking.status && booking.customerId) {
    await NotificationService.sendCustomerNotification(
      booking.customerId,
      `CarWash booking ${nextStatus.toLowerCase()}`,
      `Your booking for ${booking.serviceNameSnapshot} on ${new Date(booking.bookingDate).toLocaleDateString()} is now ${nextStatus}.`,
    );
  }
  return updated;
};

const deleteBooking = async (id: string) => {
  const booking = await Booking.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!booking) throw new Error('Booking not found');

  if (
    !['Pending', 'Confirmed'].includes(booking.status) ||
    booking.workStatus !== 'NotStarted'
  ) {
    throw new Error('Only bookings that have not started can be deleted');
  }
  await validateConfiguredCancellationWindow(
    booking.societyId,
    new Date(booking.bookingDate),
    booking.bookingTime,
  );

  const deleted = await Booking.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false,
      status: booking.status,
      workStatus: 'NotStarted',
    },
    { $set: { status: 'Cancelled', isDeleted: true } },
    { new: true, runValidators: true },
  );
  if (!deleted) {
    throw new Error('Booking changed; reload and try again');
  }

  if (booking.paymentType === 'Membership') {
    if (!booking.membershipId) {
      await Booking.updateOne(
        { _id: booking._id, status: 'Cancelled', isDeleted: true },
        { $set: { status: booking.status, isDeleted: false } },
      );
      throw new Error('Membership booking is missing its membership');
    }

    const reservation = await Membership.updateOne(
      { _id: booking.membershipId, reservedWashes: { $gt: 0 } },
      {
        $inc: { reservedWashes: -1 },
        $pull: {
          reservedBookingDates: new Date(booking.bookingDate)
            .toISOString()
            .slice(0, 10),
        },
      },
    );
    if (!reservation.modifiedCount) {
      await Booking.updateOne(
        { _id: booking._id, status: 'Cancelled', isDeleted: true },
        { $set: { status: booking.status, isDeleted: false } },
      );
      throw new Error(
        'Membership reservation not found; booking cannot be deleted',
      );
    }
  }

  await releaseSlot(booking.slotId);
  return deleted;
};

const getBookingStats = async () => {
  const to = new Date();
  to.setUTCHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 6);
  from.setUTCHours(0, 0, 0, 0);

  const [
    total,
    pending,
    confirmed,
    inProgress,
    completed,
    cancelled,
    revenue,
    dailyBookings,
  ] = await Promise.all([
    Booking.countDocuments({ isDeleted: false }),
    Booking.countDocuments({ isDeleted: false, status: 'Pending' }),
    Booking.countDocuments({ isDeleted: false, status: 'Confirmed' }),
    Booking.countDocuments({ isDeleted: false, status: 'InProgress' }),
    Booking.countDocuments({ isDeleted: false, status: 'Completed' }),
    Booking.countDocuments({ isDeleted: false, status: 'Cancelled' }),
    Booking.aggregate([
      {
        $match: {
          isDeleted: false,
          paymentStatus: 'Paid',
          paymentType: 'Individual',
        },
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amountPayable' },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          isDeleted: false,
          bookingDate: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$bookingDate',
              timezone: 'UTC',
            },
          },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          bookings: 1,
        },
      },
    ]),
  ]);

  return {
    total,
    pending,
    confirmed,
    inProgress,
    completed,
    cancelled,
    individualPaidRevenue: revenue[0]?.amount ?? 0,
    dailyBookings,
  };
};

const assignWorkerToBooking = async (
  bookingId: string,
  workerId: string,
  adminId: string,
) => {
  if (!Types.ObjectId.isValid(bookingId)) {
    throw new Error('Invalid booking ID');
  }

  if (!Types.ObjectId.isValid(workerId)) {
    throw new Error('Invalid worker ID');
  }

  if (!Types.ObjectId.isValid(adminId)) {
    throw new Error('Invalid admin ID');
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    isDeleted: false,
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (['Completed', 'Cancelled'].includes(booking.status)) {
    throw new Error('Completed or cancelled bookings cannot be assigned');
  }

  // Worker documents are stored in the separate Worker collection.
  // The Worker schema has no role field, so validate by ID and status.
  const worker = await Worker.findOne({
    _id: workerId,
    status: 'ACTIVE',
  }).select('_id name email phone status');

  if (!worker) {
    throw new Error(
      'Active worker not found. Verify the worker ID and status.',
    );
  }

  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      isDeleted: false,
      status: { $nin: ['Completed', 'Cancelled'] },
    },
    {
      $set: {
        workerId: worker._id,
        assignedAt: new Date(),
        assignedBy: new Types.ObjectId(adminId),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .populate('workerId', 'name email phone status imageUrl')
    .populate('carId')
    .populate('societyId')
    .populate('flatId')
    .populate('serviceId');

  if (!updatedBooking) {
    throw new Error('Booking could not be assigned');
  }

  await Promise.all([
    NotificationService.sendCustomerNotification(
      booking.customerId,
      'Worker assigned to your CarWash booking',
      `A worker has been assigned to your booking on ${new Date(booking.bookingDate).toLocaleDateString()} at ${booking.bookingTime}.`,
    ),
    NotificationService.sendNotificationEmail(
      worker.email,
      'New CarWash job assigned',
      `You have been assigned a ${booking.serviceNameSnapshot} booking on ${new Date(booking.bookingDate).toLocaleDateString()} at ${booking.bookingTime}.`,
    ),
  ]);

  return updatedBooking;
};

const assignWorkerToMembershipBookings = async (
  membershipId: string,
  workerId: string,
  adminId: string,
) => {
  if (
    !Types.ObjectId.isValid(membershipId) ||
    !Types.ObjectId.isValid(workerId) ||
    !Types.ObjectId.isValid(adminId)
  ) {
    throw new Error('Invalid membership, worker, or admin ID');
  }

  const [membership, worker] = await Promise.all([
    Membership.findOne({
      _id: membershipId,
      status: 'Active',
      paymentStatus: 'Paid',
      isDeleted: false,
    }).select('_id carId startDate endDate'),
    Worker.findOne({
      _id: workerId,
      status: 'ACTIVE',
    }).select('_id name email phone status'),
  ]);

  if (!membership) throw new Error('Active paid membership not found');
  if (!worker) {
    throw new Error(
      'Active worker not found. Verify the worker ID and status.',
    );
  }

  const fromToday = new Date();
  fromToday.setUTCHours(0, 0, 0, 0);
  const eligibleBookings = await Booking.find({
    membershipId: membership._id,
    carId: membership.carId,
    paymentType: 'Membership',
    paymentStatus: 'Paid',
    bookingDate: {
      $gte: new Date(
        Math.max(fromToday.getTime(), membership.startDate.getTime()),
      ),
      $lte: membership.endDate,
    },
    status: { $in: ['Pending', 'Confirmed'] },
    workStatus: { $in: ['NotStarted', null] },
    isDeleted: false,
  }).select('_id customerId bookingDate');

  const assignedAt = new Date();
  const assignedMembership = await Membership.findOneAndUpdate(
    {
      _id: membership._id,
      status: 'Active',
      paymentStatus: 'Paid',
      isDeleted: false,
    },
    {
      $set: {
        workerId: worker._id,
        assignedAt,
        assignedBy: new Types.ObjectId(adminId),
      },
    },
    { new: true },
  );
  if (!assignedMembership) {
    throw new Error('Membership is no longer active and paid');
  }

  const assignedBookingIds = eligibleBookings.map((booking) => booking._id);
  const result = assignedBookingIds.length
    ? await Booking.updateMany(
        {
          _id: { $in: assignedBookingIds },
          membershipId: membership._id,
          carId: membership.carId,
          paymentType: 'Membership',
          paymentStatus: 'Paid',
          bookingDate: {
            $gte: new Date(
              Math.max(fromToday.getTime(), membership.startDate.getTime()),
            ),
            $lte: membership.endDate,
          },
          status: { $in: ['Pending', 'Confirmed'] },
          workStatus: { $in: ['NotStarted', null] },
          isDeleted: false,
        },
        {
          $set: {
            workerId: worker._id,
            assignedAt,
            assignedBy: new Types.ObjectId(adminId),
          },
        },
      )
    : { matchedCount: 0 };

  const count = result.matchedCount;
  const startDate = new Date(
    Math.max(fromToday.getTime(), membership.startDate.getTime()),
  ).toLocaleDateString();
  const endDate = membership.endDate.toLocaleDateString();

  if (count > 0) {
    const firstBooking = eligibleBookings[0];
    if (firstBooking.customerId) {
      await NotificationService.sendCustomerNotification(
        firstBooking.customerId,
        'Worker assigned to your CarWash membership',
        `A worker has been assigned to ${count} upcoming washes for your membership, from ${startDate} to ${endDate}.`,
      );
    }
  }

  await NotificationService.sendNotificationEmail(
    worker.email,
    'CarWash membership schedule assigned',
    `You have been assigned to this membership from ${startDate} to ${endDate}. ${
      count
        ? `${count} already booked wash(es) are assigned to you.`
        : 'No washes are scheduled yet.'
    } New washes booked against this membership will also be assigned to you.`,
  );

  return {
    membershipId: String(membership._id),
    workerId: String(worker._id),
    assignedCount: count,
    futureBookingsAutoAssigned: true,
  };
};

const unassignWorkerFromMembershipBookings = async (membershipId: string) => {
  if (!Types.ObjectId.isValid(membershipId)) {
    throw new Error('Invalid membership ID');
  }

  const membership = await Membership.findOne({
    _id: membershipId,
    status: 'Active',
    paymentStatus: 'Paid',
    isDeleted: false,
  }).select('_id carId startDate endDate workerId');

  if (!membership) throw new Error('Active paid membership not found');
  if (!membership.workerId) {
    throw new Error('This membership has no assigned worker');
  }

  const fromToday = new Date();
  fromToday.setUTCHours(0, 0, 0, 0);
  const eligibleRange = {
    $gte: new Date(
      Math.max(fromToday.getTime(), membership.startDate.getTime()),
    ),
    $lte: membership.endDate,
  };
  const activeWorkerId = membership.workerId;

  const clearedMembership = await Membership.findOneAndUpdate(
    {
      _id: membership._id,
      workerId: activeWorkerId,
      status: 'Active',
      paymentStatus: 'Paid',
      isDeleted: false,
    },
    {
      $set: {
        workerId: null,
        assignedAt: null,
        assignedBy: null,
      },
    },
    { new: true },
  );
  if (!clearedMembership) {
    throw new Error('Membership assignment changed; reload and try again');
  }

  const result = await Booking.updateMany(
    {
      membershipId: membership._id,
      carId: membership.carId,
      workerId: activeWorkerId,
      paymentType: 'Membership',
      paymentStatus: 'Paid',
      bookingDate: eligibleRange,
      status: { $in: ['Pending', 'Confirmed'] },
      workStatus: { $in: ['NotStarted', null] },
      isDeleted: false,
    },
    {
      $set: {
        workerId: null,
        assignedAt: null,
        assignedBy: null,
      },
    },
  );

  return {
    membershipId: String(membership._id),
    unassignedCount: result.modifiedCount,
    futureBookingsAutoUnassigned: true,
  };
};

const unassignWorkerFromBooking = async (bookingId: string) => {
  if (!Types.ObjectId.isValid(bookingId)) {
    throw new Error('Invalid booking ID');
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    isDeleted: false,
  });

  if (!booking) {
    throw new Error('Booking not found');
  }

  if (['Completed', 'Cancelled'].includes(booking.status)) {
    throw new Error('Completed or cancelled bookings cannot be unassigned');
  }

  if (!(booking as any).workerId) {
    throw new Error('This booking has no assigned worker');
  }

  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      isDeleted: false,
    },
    {
      $set: {
        workerId: null,
        assignedAt: null,
        assignedBy: null,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .populate('workerId', 'name email phone status imageUrl')
    .populate('carId')
    .populate('societyId')
    .populate('flatId')
    .populate('serviceId');

  return updatedBooking;
};

export const BookingService = {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  submitBookingReview,
  changeBookingStatus,
  deleteBooking,
  getBookingStats,
  assignWorkerToBooking,
  assignWorkerToMembershipBookings,
  unassignWorkerFromMembershipBookings,
  unassignWorkerFromBooking,
};
