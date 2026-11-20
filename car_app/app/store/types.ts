export type RelatedEntity =
  | string
  | {
      _id?: string;
      name?: string;
      flatNumber?: string;
      block?: string;
      registrationNumber?: string;
      make?: string;
      model?: string;
      imageUrl?: string;
      city?: string;
    };

export type Car = {
  _id: string;
  societyId: RelatedEntity;
  flatId: RelatedEntity;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  registrationNumber: string;
  make: string;
  model: string;
  color: string;
  imageUrl?: string;
  carType: 'Hatchback' | 'Sedan' | 'SUV' | 'MUV' | 'Luxury' | 'Other';
  parkingSlot?: string;
  status: string;
  description?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationNote?: string;
};

export type Society = {
  _id: string;
  name: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  description?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationNote?: string;
};

export type Flat = {
  _id: string;
  societyId: RelatedEntity;
  flatNumber: string;
  block?: string;
  floorNumber?: number;
  flatType?: string;
  area?: number;
  status: 'Available' | 'Occupied' | 'Maintenance';
  description?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verificationNote?: string;
};

export type WashService = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  status: 'Active' | 'Inactive';
};

export type Slot = {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: 'available' | 'booked' | 'canceled';
  washServiceId?: RelatedEntity;
};

export type Booking = {
  _id: string;
  societyId: RelatedEntity;
  flatId: RelatedEntity;
  carId: RelatedEntity;
  serviceId: RelatedEntity;
  slotId?: RelatedEntity;
  bookingDate: string;
  bookingTime: string;
  serviceNameSnapshot: string;
  servicePriceSnapshot: number;
  amountPayable: number;
  paymentStatus: string;
  paymentType: string;
  paymentMethod?: 'Stripe' | 'Cash' | 'UPI';
  cashCollectionStatus?: 'NotRecorded' | 'Received' | 'NotReceived';
  cashCollectionUpdatedAt?: string | null;
  cashCollectionUpdatedByWorker?: RelatedEntity;
  cashCollectionUpdatedByAdmin?: RelatedEntity;
  membershipId?: string | {
    _id?: string;
    includedWashes?: number;
    usedWashes?: number;
    reservedWashes?: number;
  };
  status: 'Pending' | 'Confirmed' | 'InProgress' | 'Completed' | 'Cancelled';
  workStatus?: 'NotStarted' | 'Working' | 'Paused' | 'Completed';
  currentWorkStartedAt?: string | null;
  totalWorkingSeconds?: number;
  workCompletedAt?: string | null;
  workSessions?: {
    startedAt: string;
    endedAt?: string | null;
    durationSeconds?: number;
  }[];
  beforePhoto?: string;
  afterPhoto?: string;
  cleaningChecklist?: {
    exteriorWash: boolean;
    interiorCleaning: boolean;
    dashboard: boolean;
    tyreDressing: boolean;
    vacuumCleaning: boolean;
  };
  workerNotes?: string;
  customerRating?: number;
  customerReview?: string;
  reviewedAt?: string;
  remarks?: string;
};

export type Membership = {
  _id: string;
  carId: RelatedEntity;
  flatId: RelatedEntity;
  planId: RelatedEntity;
  societyId: RelatedEntity;
  startDate: string;
  endDate: string;
  totalAmount: number;
  includedWashes: number;
  usedWashes: number;
  reservedWashes: number;
  planNameSnapshot?: string;
  planValidityDays?: number;
  planServicesSnapshot?: string[];
  daysRemaining?: number;
  renewalDueDate?: string;
  renewalDueSoon?: boolean;
  remainingWashes?: number;
  completedWashes?: number;
  scheduledWashes?: number;
  washHistory?: {
    _id: string;
    bookingDate: string;
    bookingTime: string;
    serviceNameSnapshot: string;
    status: string;
    workStatus?: string;
    workCompletedAt?: string | null;
    totalWorkingSeconds?: number;
  }[];
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  status: 'Pending' | 'Active' | 'Expired' | 'Cancelled';
};

export type MembershipPlan = {
  _id: string;
  name: string;
  description?: string;
  societyId: RelatedEntity;
  price: number;
  includedWashes: number;
  validityDays: number;
  billingCycle: string;
  services: string[];
};

export type MembershipOffer = {
  _id: string;
  title: string;
  planId: RelatedEntity;
  discountType: 'Percentage' | 'Fixed';
  discountValue: number;
  startDate: string;
  endDate: string;
};

export type WorkerDashboard = {
  assignedBookings: number;
  pendingJobs: number;
  completedJobs: number;
  todayJobs: number;
  recentBookings: Booking[];
};

export type WorkerAttendance = {
  _id: string;
  dateKey: string;
  punchInAt: string;
  punchInSelfie: string;
  punchOutAt?: string | null;
  punchOutSelfie?: string | null;
};
