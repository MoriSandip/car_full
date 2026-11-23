import mongoose, { FilterQuery } from "mongoose";
import Membership from "./membership.model";
import { TMembership } from "./membership.interface";
import { Car } from "../Car/car.model";
import { Society } from "../Society/society.model";
import Flat from "../Flat/flat.model";
import Plan from "../PlanCharges/plan.model";
import Offer from "../Offer/offer.model";
import Booking from "../Booking/booking.model";
import { OfferServices } from "../Offer/offer.service";

type MembershipFilters = {
  search?: string;
  status?: TMembership["status"];
  paymentStatus?: TMembership["paymentStatus"];
  societyId?: string;
  flatId?: string;
  carId?: string;
  planId?: string;
  page?: number;
  limit?: number;
};

type MembershipRelations = {
  carId: string;
  societyId: string;
  flatId: string;
  planId: string;
  offerId?: string;
};

type TValidatedRelations = {
  amount: number;
  includedWashes: number;
  planName: string;
  planValidityDays: number;
  planServices: string[];
  offerId?: string;
};

type MembershipProgressSource = {
  _id: mongoose.Types.ObjectId | string;
  startDate: Date;
  endDate: Date;
  status: TMembership["status"];
  planId?: mongoose.Types.ObjectId | string | { name?: string; services?: string[] } | null;
  planNameSnapshot?: string;
  planValidityDays?: number;
  planServicesSnapshot?: string[];
  includedWashes?: number;
  usedWashes?: number;
  reservedWashes?: number;
  toObject?: () => MembershipProgressSource;
};

function serviceError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function validId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw serviceError("Invalid MongoDB ID", 400);
  }
}

function populateMembership(query: any) {
  return query
    .populate(
      "carId",
      "registrationNumber make model color ownerName ownerPhone societyId flatId status"
    )
    .populate("societyId", "name city")
    .populate("flatId", "flatNumber block floorNumber")
    .populate("planId")
    .populate("offerId");
}

const utcDateKey = (date: Date) => date.toISOString().slice(0, 10);

const indiaDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
};

const daysBetweenDateKeys = (from: string, to: string) => {
  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);
  return Math.round((toTime - fromTime) / 86_400_000);
};

const expireMemberships = async () => {
  await Membership.updateMany(
    {
      status: "Active",
      paymentStatus: "Paid",
      endDate: { $lt: new Date() },
      isDeleted: false,
    },
    { $set: { status: "Expired" } },
  );
};

async function addMembershipProgress<T extends MembershipProgressSource>(
  memberships: T[],
) {
  if (!memberships.length) return memberships;
  const todayKey = indiaDateKey(new Date());
  const ids = memberships.map((membership) => membership._id);
  const bookings = await Booking.find({
    membershipId: { $in: ids },
    paymentType: "Membership",
    isDeleted: false,
    status: { $ne: "Cancelled" },
  })
    .select(
      "_id membershipId bookingDate bookingTime serviceNameSnapshot status workStatus workCompletedAt totalWorkingSeconds",
    )
    .sort({ bookingDate: 1, bookingTime: 1 })
    .lean();
  const bookingsByMembership = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    const key = String(booking.membershipId);
    const list = bookingsByMembership.get(key) ?? [];
    list.push(booking);
    bookingsByMembership.set(key, list);
  }

  return memberships.map((membership) => {
    // Convert populated Mongoose documents before spreading so relation fields
    // remain in the API response rather than leaking only document internals.
    const membershipData = membership.toObject?.() ?? membership;
    const id = String(membershipData._id);
    const washHistory = bookingsByMembership.get(id) ?? [];
    const startKey = utcDateKey(new Date(membershipData.startDate));
    const endKey = utcDateKey(new Date(membershipData.endDate));
    const validityDays =
      Number(membershipData.planValidityDays) ||
      Math.max(1, daysBetweenDateKeys(startKey, endKey) + 1);
    const daysRemaining =
      todayKey < startKey
        ? validityDays
        : todayKey > endKey
          ? 0
          : daysBetweenDateKeys(todayKey, endKey) + 1;
    const includedWashes = Number(membershipData.includedWashes ?? 0);
    const usedWashes = Number(membershipData.usedWashes ?? 0);
    const reservedWashes = Number(membershipData.reservedWashes ?? 0);
    const populatedPlan =
      membershipData.planId &&
      typeof membershipData.planId === "object" &&
      "name" in membershipData.planId
        ? membershipData.planId
        : undefined;
    return {
      ...membershipData,
      planNameSnapshot:
        membershipData.planNameSnapshot ||
        populatedPlan?.name ||
        "Membership plan",
      planValidityDays: validityDays,
      planServicesSnapshot:
        membershipData.planServicesSnapshot?.length
          ? membershipData.planServicesSnapshot
          : populatedPlan
            ? populatedPlan.services ?? []
            : [],
      daysRemaining,
      renewalDueDate: membershipData.endDate,
      renewalDueSoon:
        membershipData.status === "Active" && daysRemaining > 0 && daysRemaining <= 7,
      remainingWashes: Math.max(
        0,
        includedWashes - usedWashes - reservedWashes,
      ),
      completedWashes: usedWashes,
      scheduledWashes: washHistory.filter((booking) =>
        ["Pending", "Confirmed", "InProgress"].includes(booking.status),
      ).length,
      washHistory,
    };
  });
}

async function validateRelations(
  data: MembershipRelations,
  validateOffer = false,
): Promise<TValidatedRelations> {
  validId(data.carId);
  validId(data.societyId);
  validId(data.flatId);
  validId(data.planId);

  const [car, society, flat, plan] = await Promise.all([
    Car.findOne({
      _id: data.carId,
      isDeleted: false,
    }),
    Society.findOne({
      _id: data.societyId,
      isDeleted: { $ne: true },
    }),
    Flat.findOne({
      _id: data.flatId,
      societyId: data.societyId,
      isDeleted: { $ne: true },
    }),
    Plan.findOne({
      _id: data.planId,
      isDeleted: { $ne: true },
    }),
  ]);

  if (!car) {
    throw serviceError("Car not found", 404);
  }

  if (car.status !== "Active") {
    throw serviceError("Only active cars can have memberships", 400);
  }

  if (!society) {
    throw serviceError("Society not found", 404);
  }
  if (society.status !== "VERIFIED") {
    throw serviceError("Selected Society is not verified by admin yet", 400);
  }

  if (!flat) {
    throw serviceError("Flat does not belong to selected Society", 400);
  }

  if (!plan) {
    throw serviceError("Plan not found", 404);
  }

  if (
    String(car.societyId) !== data.societyId ||
    String(car.flatId) !== data.flatId
  ) {
    throw serviceError(
      "Selected car does not belong to the selected Society and Flat",
      400
    );
  }

  const planData = plan as any;

  if (
    planData.status !== undefined &&
    planData.status !== "Active"
  ) {
    throw serviceError("Selected plan is not active", 400);
  }

  let amount = Number(planData.price);
  let offerId: string | undefined;

  if (!Number.isFinite(amount) || amount < 0) {
    throw serviceError("Plan has an invalid price", 400);
  }

  if (validateOffer && data.offerId) {
    validId(data.offerId);
    const offer = await Offer.findOne({
      _id: data.offerId,
      planId: data.planId,
      status: "Active",
      isDeleted: false,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });
    if (!offer) {
      throw serviceError(
        "Selected offer is not active, valid, or assigned to this plan",
        400
      );
    }

    const discount =
      offer.discountType === "Percentage"
        ? (amount * offer.discountValue) / 100
        : offer.discountValue;
    amount = Math.max(0, amount - discount);
    offerId = String(offer._id);
  }

  const includedWashes = Number(planData.includedWashes ?? 0);
  const planValidityDays = Number(planData.validityDays ?? 0);

  if (
    !Number.isInteger(includedWashes) ||
    includedWashes < 0
  ) {
    throw serviceError("Plan has invalid included washes", 400);
  }
  if (!Number.isInteger(planValidityDays) || planValidityDays < 1) {
    throw serviceError("Plan has invalid validity days", 400);
  }

  return {
    amount,
    includedWashes,
    planName: String(planData.name ?? ""),
    planValidityDays,
    planServices: Array.isArray(planData.services)
      ? planData.services.map(String)
      : [],
    offerId,
  };
}

async function checkDateOverlap(
  carId: string,
  planId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string
): Promise<void> {
  const query: FilterQuery<TMembership> = {
    carId: new mongoose.Types.ObjectId(carId),
    planId: new mongoose.Types.ObjectId(planId),
    isDeleted: false,
    status: { $in: ["Pending", "Active"] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  };

  if (excludeId) {
    query._id = {
      $ne: new mongoose.Types.ObjectId(excludeId),
    } as any;
  }

  const conflict = await Membership.findOne(query);

  if (conflict) {
    throw serviceError(
      "This car already has a Pending or Active membership for this plan during overlapping dates",
      409
    );
  }
}

async function createMembership(payload: {
  carId: string;
  planId: string;
  offerId?: string;
  societyId: string;
  flatId: string;
  startDate: Date;
  endDate: Date;
  status?: TMembership["status"];
  paymentStatus?: TMembership["paymentStatus"];
  remarks?: string;
}) {
  const startDate = new Date(payload.startDate);
  const endDate = new Date(payload.endDate);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate < startDate
  ) {
    throw serviceError("Invalid membership dates", 400);
  }

  const {
    amount,
    includedWashes,
    offerId,
    planName,
    planValidityDays,
    planServices,
  } = await validateRelations(
    payload,
    true,
  );

  const status = payload.status ?? "Pending";
  const paymentStatus = payload.paymentStatus ?? "Pending";

  if (status === "Expired" || status === "Cancelled") {
    throw serviceError(
      "Membership cannot be created with Expired or Cancelled status",
      400
    );
  }

  await checkDateOverlap(payload.carId, payload.planId, startDate, endDate);

  const membership = await Membership.create({
    carId: payload.carId,
    planId: payload.planId,
    ...(offerId ? { offerId } : {}),
    societyId: payload.societyId,
    flatId: payload.flatId,
    startDate,
    endDate,
    remarks: payload.remarks,
    totalAmount: amount,

    // Snapshot the wash allowance from the selected plan.
    includedWashes,
    planNameSnapshot: planName,
    planValidityDays,
    planServicesSnapshot: planServices,
    usedWashes: 0,
    reservedWashes: 0,

    status,
    paymentStatus,
    isDeleted: false,
  });

  return populateMembership(
    Membership.findById(membership._id)
  );
}

async function createCustomerMembership(
  customerId: string,
  payload: { carId: string; planId: string; offerId?: string; couponCode?: string; referralCode?: string; startDate?: Date },
) {
  validId(customerId);
  validId(payload.carId);
  validId(payload.planId);

  const car = await Car.findOne({
    _id: payload.carId,
    createdBy: customerId,
    createdByRole: "CUSTOMER",
    verificationStatus: "VERIFIED",
    status: "Active",
    isDeleted: false,
  });
  if (!car) {
    throw serviceError("Verified active car not found for this customer", 404);
  }

  const plan = await Plan.findOne({
    _id: payload.planId,
    societyId: car.societyId,
    status: "Active",
    isDeleted: false,
  });
  if (!plan) {
    throw serviceError("Active plan not found for this car's society", 404);
  }

  if (payload.referralCode) {
    await OfferServices.redeemReferralCode(customerId, payload.referralCode);
  }

  const startDate = payload.startDate ? new Date(payload.startDate) : new Date();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (Number.isNaN(startDate.getTime()) || startDate < today) {
    throw serviceError("Membership start date cannot be in the past", 400);
  }
  startDate.setUTCHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + plan.validityDays);
  endDate.setUTCMilliseconds(endDate.getUTCMilliseconds() - 1);

  const relations: MembershipRelations = {
    carId: String(car._id),
    societyId: String(car.societyId),
    flatId: String(car.flatId),
    planId: String(plan._id),
    ...(payload.offerId ? { offerId: payload.offerId } : {}),
  };
  if (payload.couponCode) {
    const coupon = await OfferServices.validateCoupon(
      customerId,
      String(plan._id),
      payload.couponCode,
    );
    relations.offerId = coupon.offerId;
  }
  const { amount, includedWashes, offerId } = await validateRelations(
    relations,
    true,
  );
  await checkDateOverlap(
    String(car._id),
    String(plan._id),
    startDate,
    endDate,
  );

  const membership = await Membership.create({
    ...relations,
    ...(offerId ? { offerId } : {}),
    startDate,
    endDate,
    totalAmount: amount,
    includedWashes,
    planNameSnapshot: plan.name,
    planValidityDays: plan.validityDays,
    planServicesSnapshot: plan.services,
    usedWashes: 0,
    reservedWashes: 0,
    status: amount === 0 ? "Active" : "Pending",
    paymentStatus: amount === 0 ? "Paid" : "Pending",
    isDeleted: false,
  });
  if (offerId && payload.couponCode) {
    await OfferServices.recordCouponRedemption(
      customerId,
      offerId,
      String(membership._id),
    );
  }
  const referralReward = await OfferServices.applyCompletedReferralReward(
    customerId,
    String(membership._id),
    amount,
  );
  if (referralReward.referralReward > 0 && referralReward.amount !== amount) {
    membership.totalAmount = referralReward.amount;
    membership.status = referralReward.amount === 0 ? "Active" : "Pending";
    membership.paymentStatus = referralReward.amount === 0 ? "Paid" : "Pending";
    await membership.save();
  }

  return populateMembership(Membership.findById(membership._id));
}

async function getCustomerPlansForCar(customerId: string, carId: string) {
  validId(customerId);
  validId(carId);
  const car = await Car.findOne({
    _id: carId,
    createdBy: customerId,
    createdByRole: "CUSTOMER",
    verificationStatus: "VERIFIED",
    status: "Active",
    isDeleted: false,
  }).select("_id societyId");
  if (!car) {
    throw serviceError("Verified active car not found for this customer", 404);
  }
  return Plan.find({
    societyId: car.societyId,
    status: "Active",
    isDeleted: false,
  })
    .populate("societyId", "name city")
    .sort({ createdAt: -1 })
    .lean();
}

async function getCustomerMemberships(customerId: string) {
  await expireMemberships();
  validId(customerId);
  const customerCars = await Car.find({
    createdBy: customerId,
    createdByRole: "CUSTOMER",
    isDeleted: false,
  }).distinct("_id");
  const memberships = await populateMembership(
    Membership.find({
      carId: { $in: customerCars },
      isDeleted: false,
    }).sort({ createdAt: -1 }),
  ).exec();
  return addMembershipProgress(memberships);
}

async function getAllMemberships(filters: MembershipFilters) {
  await expireMemberships();
  const {
    search,
    status,
    paymentStatus,
    societyId,
    flatId,
    carId,
    planId,
    page = 1,
    limit = 10,
  } = filters;

  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safeLimit = Math.min(
    100,
    Math.max(1, Math.floor(Number(limit) || 10))
  );

  const query: FilterQuery<TMembership> = {
    isDeleted: false,
  };

  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  if (societyId) {
    validId(societyId);
    query.societyId = new mongoose.Types.ObjectId(societyId);
  }

  if (flatId) {
    validId(flatId);
    query.flatId = new mongoose.Types.ObjectId(flatId);
  }

  if (carId) {
    validId(carId);
    query.carId = new mongoose.Types.ObjectId(carId);
  }

  if (planId) {
    validId(planId);
    query.planId = new mongoose.Types.ObjectId(planId);
  }

  if (search?.trim()) {
    const escaped = search
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(escaped, "i");

    const matchingCars = await Car.find({
      isDeleted: false,
      $or: [
        { registrationNumber: regex },
        { ownerName: regex },
        { ownerPhone: regex },
        { make: regex },
        { model: regex },
      ],
    }).select("_id");

    const matchingCarIds = matchingCars.map((car) => car._id);

    if (
      carId &&
      !matchingCarIds.some(
        (matchingId) => String(matchingId) === carId
      )
    ) {
      query.carId = { $in: [] };
    } else {
      query.carId = {
        $in: matchingCarIds,
      };
    }
  }

  const skip = (safePage - 1) * safeLimit;

  const [rawData, total] = await Promise.all([
    populateMembership(Membership.find(query))
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .exec(),

    Membership.countDocuments(query),
  ]);
  const data = await addMembershipProgress(rawData);

  return {
    data,
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

async function getSingleMembership(id: string) {
  await expireMemberships();
  validId(id);

  const membership = await populateMembership(
    Membership.findOne({
      _id: id,
      isDeleted: false,
    })
  ).exec();

  if (!membership) {
    throw serviceError("Membership not found", 404);
  }

  const [withProgress] = await addMembershipProgress([membership]);
  return withProgress;
}

async function updateMembership(
  id: string,
  payload: Partial<{
    carId: string;
    planId: string;
    offerId?: string | null;
    societyId: string;
    flatId: string;
    startDate: Date;
    endDate: Date;
    status: TMembership["status"];
    paymentStatus: TMembership["paymentStatus"];
    remarks: string;
  }>
) {
  validId(id);

  const existing = await Membership.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!existing) {
    throw serviceError("Membership not found", 404);
  }

  if (["Cancelled", "Expired"].includes(existing.status)) {
    throw serviceError(
      "Cancelled or expired memberships cannot be edited",
      400
    );
  }

  const merged = {
    carId: String(payload.carId ?? existing.carId),
    planId: String(payload.planId ?? existing.planId),
    societyId: String(payload.societyId ?? existing.societyId),
    flatId: String(payload.flatId ?? existing.flatId),
    startDate: new Date(
      payload.startDate ?? existing.startDate
    ),
    endDate: new Date(
      payload.endDate ?? existing.endDate
    ),
  };

  if (
    Number.isNaN(merged.startDate.getTime()) ||
    Number.isNaN(merged.endDate.getTime()) ||
    merged.endDate < merged.startDate
  ) {
    throw serviceError("Invalid membership dates", 400);
  }

  await checkDateOverlap(
    merged.carId,
    merged.planId,
    merged.startDate,
    merged.endDate,
    id
  );

  const planChanged =
    String(existing.planId) !== merged.planId;
  const pricingChanged = planChanged || payload.offerId !== undefined;
  const mergedOfferId =
    payload.offerId === null
      ? undefined
      : payload.offerId ??
        (planChanged ? undefined : String(existing.offerId ?? "") || undefined);
  const {
    amount,
    includedWashes: planIncludedWashes,
    offerId,
    planName,
    planValidityDays,
    planServices,
  } = await validateRelations(
    {
      ...merged,
      ...(mergedOfferId ? { offerId: mergedOfferId } : {}),
    },
    pricingChanged,
  );
  const hasWashUsage =
    Number((existing as any).usedWashes ?? 0) > 0 ||
    Number((existing as any).reservedWashes ?? 0) > 0;

  if (planChanged && hasWashUsage) {
    throw serviceError(
      "Cannot change the plan after washes have been used or reserved",
      400
    );
  }

  const updateFields: Record<string, unknown> = {
    ...payload,
    ...merged,
    totalAmount: pricingChanged ? amount : existing.totalAmount,
  };
  if (pricingChanged) updateFields.offerId = offerId ?? null;

  // Preserve the allowance snapshot unless the plan changes.
  // Do not overwrite usage counters during an ordinary edit.
  if (planChanged) {
    updateFields.includedWashes = planIncludedWashes;
    updateFields.usedWashes = 0;
    updateFields.reservedWashes = 0;
    updateFields.usedBookingDates = [];
    updateFields.reservedBookingDates = [];
    updateFields.planNameSnapshot = planName;
    updateFields.planValidityDays = planValidityDays;
    updateFields.planServicesSnapshot = planServices;
  }

  const updated = await Membership.findOneAndUpdate(
    {
      _id: id,
      isDeleted: false,
    },
    {
      $set: updateFields,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updated) {
    throw serviceError("Membership not found", 404);
  }

  return populateMembership(
    Membership.findById(updated._id)
  );
}

async function deleteMembership(id: string) {
  validId(id);

  const membership = await Membership.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!membership) {
    throw serviceError("Membership not found", 404);
  }

  const reservedWashes = Number(
    (membership as any).reservedWashes ?? 0
  );

  if (reservedWashes > 0) {
    throw serviceError(
      "Cannot delete membership while washes are reserved for bookings",
      409
    );
  }

  membership.isDeleted = true;
  await membership.save();

  return membership;
}

async function getMembershipStats() {
  await expireMemberships();
  const [
    total,
    pending,
    active,
    expired,
    cancelled,
    paymentPending,
    paid,
  ] = await Promise.all([
    Membership.countDocuments({ isDeleted: false }),
    Membership.countDocuments({
      isDeleted: false,
      status: "Pending",
    }),
    Membership.countDocuments({
      isDeleted: false,
      status: "Active",
    }),
    Membership.countDocuments({
      isDeleted: false,
      status: "Expired",
    }),
    Membership.countDocuments({
      isDeleted: false,
      status: "Cancelled",
    }),
    Membership.countDocuments({
      isDeleted: false,
      paymentStatus: "Pending",
    }),
    Membership.countDocuments({
      isDeleted: false,
      paymentStatus: "Paid",
    }),
  ]);

  return {
    total,
    pending,
    active,
    expired,
    cancelled,
    paymentPending,
    paid,
  };
}

export const MembershipServices = {
  createMembership,
  createCustomerMembership,
  getCustomerPlansForCar,
  getCustomerMemberships,
  getAllMemberships,
  getSingleMembership,
  updateMembership,
  deleteMembership,
  getMembershipStats,
};
