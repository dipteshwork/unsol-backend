import { Schema } from "mongoose";
import mongoose from "mongoose";
import mongooseCounter from "mongoose-counters";
import identitySchema from "./idSchema";
import submissionSchema from "./submissionSchema";

const counter = mongooseCounter(mongoose);
const entryType = ["Entity", "Vessel", "Individual", "Aircraft"];
const workflowStatus = [
  "NEW",
  "PENDING",
  "AMEND",
  "ACTIVE",
  "ONHOLD",
  "ONHOLDEXTENDED",
  "SUBMIT4REVIEW",
  "DELISTED",
  "RECORDREVIEW",
  "REMOVED",
];

// Pending = 0
// Submitted for review = 1
// On hold = 2
// Active = 3
// De-listed = 4
// Superseded = 5

let sanctionsLstSchema = new Schema(
  {
    scSanctionEntry: {
      addtlInfo: String,
      entry: {
        entryStatus: {
          type: String,
          required: true,
        },
        entryType: String,
        entryId: { type: Number, required: true },
        statusModifiedDte: Date,
        statusModifiedBy: String,
        isStatusCurrent: Boolean,
        rptStatusCount: { type: Number, default: 0 },
        rptStatusDates: [Date],
        //"entryType":String, // "removedDte":Date, "removedReason":String,
        // "language"[langz],  //aw should be deleted, as we wouldn't be using this
        language: [
          {
            additionalInformation: String,
            identity: [identitySchema],
            lang: String,
            narrativeUpdatedOn: [String],
            narrativeWebsiteDate: String,
            reasonForListing: String,
            relatedList: [String],
          },
        ],
        listings: {
          unListType: [
            {
              interpolUNSN: String,
              listName: String,
              measure: [String],
              narrativeSummary: String,
              note: String,
              referenceNumber: String,
              updates: {
                updated: [
                  {
                    pressRelease: String,
                    updateType: String,
                    updatedOn: String,
                    pressReleaseId: String,
                    refNumOrEntryId: String,
                  },
                ],
              },
              unlstItmsDef: {
                updates: {
                  updated: [
                    {
                      pressRelease: String,
                      updateType: String,
                      updatedOn: String,
                      pressReleaseId: String,
                      refNumOrEntryId: String,
                    },
                  ],
                },
                measure: [String],
              },
            },
          ],
        },
        remarks: String,
        submission: submissionSchema,
        versionHistory: [
          {
            status: String,
            statusModifiedDte: Date,
            rptStatusCount: Number
          }
        ]
      },
      langs: {
        idLst: [identitySchema],
        lang: { type: String },
        languagesUUID: String,
      },
      listngReason: String,
      narrUpdteOn: [String],
      narrWbSteDte: String,
      // related list is used to relate an entity with individuals affiliated with it and vice versaor family members
      relatedLst: [String],
      activityLog: [
        {
          activityDte: { type: Date, required: true },
          userEmail: { type: String, required: true },
          userTask: { type: String, required: false, default: "" },
          activityNotes: { type: String, default: "" },
          prevState: { type: String },
          // prevState: { type: String, enum: workflowStatus },
          currState: { type: String },
          // currState: { type: String, enum: workflowStatus },
          refNum: { type: String, default: "" },
          orderId: { type: Number },
        },
      ],
      amendmentId: { type: String },
      amendmentInfo: [
        {
          amendmentCount: { type: Number },
          amendmentDte: Date,
          child: { amendmentId: { type: String } },
        },
      ],
      supersededInfo: { isSuperSeded: Boolean, supersededDte: Date },
      ancestors: [{ identifier: mongoose.Types.ObjectId, _id: false }],
      parent: mongoose.Types.ObjectId,
      // entryStatusCreateDte is ALWAYS the same as the entry.statusModifiedDte above
      siblings: [
        {
          identifier: mongoose.Types.ObjectId,
          entryId: Number,
          entryStatus: String,
          entryStatusCreateDte: Date,
        },
      ],
      // placeholder in case we need to keep track of the same individual, entity, vessel, etc. being sanctiond under another regime
      sameSubjectFoundInOtherEntries: [{ identifier: mongoose.Types.ObjectId }],
      versionId: String,
      workingMainLanguage: { type: String, required: true },
      userEmail: { type: String, required: true },
      docUnderscoreId: String,
      submitReviewConfirmed: { type: Boolean, required: true, default: false },
      translated: { type: Boolean, required: false, default: false },
    },
  },
  { versionKey: false }
);
// removing the counter as we this will muddy things up.  Will update this when needed at insert time.
// sanctionsLstSchema.plugin(counter, { incField: 'scSanctionEntry.entry.entryId'});

export default sanctionsLstSchema;
