
import { model, Schema } from "mongoose";
import {
    MembershipModel,
    TMembership,
} from "./membership.interface";

const membershipSchema = new Schema<TMembership, MembershipModel>(
    {
        carId: {
            type: Schema.Types.ObjectId,
            ref: "Car",
            required: true,
        },
        planId: {
            type: Schema.Types.ObjectId,
            ref: "Plan",
            required: true,
        },
        offerId: {
            type: Schema.Types.ObjectId,
            ref: "Offer",
            required: false,
        },
        societyId: {
            type: Schema.Types.ObjectId,
            ref: "Society",
            required: true,
        },
        flatId: {
            type: Schema.Types.ObjectId,
            ref: "Flat",
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid", "Failed", "Refunded"],
            default: "Pending",
        },
        status: {
            type: String,
            enum: ["Pending", "Active", "Expired", "Cancelled"],
            default: "Pending",
        },
        remarks: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },

        includedWashes: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        usedWashes: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        reservedWashes: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        planNameSnapshot: { type: String, trim: true, default: "" },
        planValidityDays: { type: Number, min: 1 },
        planServicesSnapshot: { type: [String], default: [] },
        reservedBookingDates: { type: [String], default: [] },
        usedBookingDates: { type: [String], default: [] },
        workerId: {
            type: Schema.Types.ObjectId,
            ref: "Worker",
            default: null,
        },
        assignedAt: {
            type: Date,
            default: null,
        },
        assignedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

    },
    { timestamps: true }
);

membershipSchema.index({
    carId: 1,
    startDate: 1,
    endDate: 1,
    status: 1,
});

membershipSchema.index({ societyId: 1, flatId: 1 });
membershipSchema.index({ status: 1, endDate: 1 });
membershipSchema.index({ isDeleted: 1, createdAt: -1 });

const Membership = model<TMembership, MembershipModel>(
    "Membership",
    membershipSchema
);

export default Membership;
