import { model, Schema, Types } from "mongoose";
import { IUser, IUserMethods, IUserModel } from "../types/types";
import bcrypt from "bcrypt";
import { logger } from "../utils/logger";
import { responseType } from "../constants";
import { ApiError } from "../utils/custom-api-error";

/*
  Schema<TDocument, TModel, TInstanceMethods> generic

  Tdocument:-
  It defines the overall shape and structure of the "document"

  TModel:-
  It defines the overall shape of the "model" with any static-methods (i.e., model-level operations which work on the complete model/collection)

  TInstanceMethods:-
  It defines the overall shape of the instance methods on a document (i.e., methods that can be called on individual document instances, such as validating password etc.)

  BEST-PRACTICE: 
  `new Schema<IUser, IUserModel, IUserMethods>` gives the flexibility to define static methods & instance methods, whereas `new Schema<IUser>` allows only for instance methods.
  It's better to declare the types and Schema-generic-parameters separately
*/
const UserSchema = new Schema<IUser, IUserModel, IUserMethods>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      // unique: true,
      // required: true,
    },
    email: {
      type: String,
      trim: true,
      // unique: true,
      required: true,
    },
    password: {
      type: String,
      // required: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    token: String,
    tokenExpiry: Date,
  },
  { timestamps: true, validateBeforeSave: true }
);

// Hash the password everytime before saving
UserSchema.pre("save", async function () {
  try {
    // Hash the password only if it was modified
    if (this.password && this.isModified("password")) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  } catch (error: any) {
    logger(
      responseType.DATABASE_ERROR.type,
      "Password could not be hashed before saving"
    );
    throw error;
  }
});

// Mongoose Instance method to validate password
/*
  NOTE: For TypeScript to recognize mongoose methods, we have to define the type/interface for mongoose methods separately and declare them while creating the Schema
*/
UserSchema.methods.validatePassword = async function (
  password: string
): Promise<boolean> {
  if (!this.password) {
    throw new ApiError(
      responseType.UNSUCCESSFUL.code,
      responseType.UNSUCCESSFUL.type,
      "Ensure that correct login method is being used."
    );
  }
  try {
    const isPasswordCorrect = await bcrypt.compare(password, this.password);
    return isPasswordCorrect;
  } catch (error) {
    logger(
      responseType.DATABASE_ERROR.type,
      "The password could not be compared with the hashed password stored in database"
    );

    throw new ApiError(
      responseType.DATABASE_ERROR.code,
      responseType.DATABASE_ERROR.type,
      "The password could not be compared with the hashed password stored in database",
      error
    );
  }
};

// Mongoose Static methods
UserSchema.statics.getUsersByProject = async function ({
  projectId,
  startDate,
  endDate,
  page = 1,
  queryItemCount = 10,
}) {
  try {
    let isPageValid: boolean = true;
    // Calculate documents to skip based on pagination
    let skipDocs = (page - 1) * queryItemCount; // Create base query
    const query = {
      projectId: new Types.ObjectId(String(projectId)),
      // Add date range filter if provided
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate !== "undefined"
                ? { $gte: new Date(startDate) }
                : {}),
              ...(endDate !== "undefined" ? { $lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };
    // Get total count for pagination
    const totalDocs = await this.countDocuments(query);

    if (!totalDocs) {
      throw new ApiError(
        responseType.UNSUCCESSFUL.code,
        responseType.UNSUCCESSFUL.type,
        `No users found for the requested query`
      );
    }

    // Validate page number
    if (totalDocs && Math.ceil(totalDocs / queryItemCount) < page) {
      isPageValid = false;
      skipDocs = 0; // Reset the skipDocs to 0 if the page number is invalid
    }

    // Fetch users with pagination
    const users = await this.aggregate([
      {
        $match: query,
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: skipDocs,
      },
      {
        $limit: queryItemCount,
      },
      {
        $project: {
          password: 0,
          token: 0,
          tokenExpiry: 0,
          __v: 0,
          updatedAt: 0,
        },
      },
    ]);

    return {
      users,
      pagination: {
        hasNextPage: isPageValid ? page * queryItemCount < totalDocs : false,
        hasPreviousPage: isPageValid ? page > 1 : false,
        itemLimit: queryItemCount,
        currentPageNumber: isPageValid ? page : 1,
        totalDocs,
        totalPages: Math.ceil(totalDocs / queryItemCount),
      },
    };
  } catch (error: any) {
    logger(
      responseType.DATABASE_ERROR.type,
      `Unable to fetch users | Error: ${error.message}`
    );
    throw error;
  }
};

UserSchema.statics.searchUsers = async function ({
  searchQuery,
  projectId,
  startDate,
  endDate,
  page = 1,
  queryItemCount = 10,
}) {
  try {
    let isPageValid: boolean = true;
    let skipDocs = (page - 1) * queryItemCount;

    // Build search criteria
    const searchCriteria = {
      $or: [
        { username: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
        // Only add _id search if the searchQuery is a valid ObjectId
        ...(Types.ObjectId.isValid(searchQuery)
          ? [{ _id: new Types.ObjectId(searchQuery as string) }]
          : []),
      ],
      // Add projectId filter if provided
      ...(projectId
        ? { projectId: new Types.ObjectId(String(projectId)) }
        : {}),
      // Add date range filter if provided
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate !== "undefined"
                ? { $gte: new Date(startDate) }
                : {}),
              ...(endDate !== "undefined" ? { $lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    // Get total count for pagination
    const totalDocs = await this.countDocuments(searchCriteria);

    if (!totalDocs) {
      throw new ApiError(
        responseType.UNSUCCESSFUL.code,
        responseType.UNSUCCESSFUL.type,
        `No users found matching the search criteria`
      );
    }

    // Validate page number
    if (totalDocs && Math.ceil(totalDocs / queryItemCount) < page) {
      isPageValid = false;
      skipDocs = 0; // Reset the skipDocs to 0 if the page number is invalid
    }

    // Fetch users with pagination
    const users = await this.aggregate([
      {
        $match: searchCriteria,
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $skip: skipDocs,
      },
      {
        $limit: queryItemCount,
      },
      {
        $project: {
          password: 0,
          token: 0,
          tokenExpiry: 0,
          __v: 0,
          updatedAt: 0,
        },
      },
    ]);

    return {
      users,
      pagination: {
        hasNextPage: isPageValid ? page * queryItemCount < totalDocs : false,
        hasPreviousPage: isPageValid ? page > 1 : false,
        itemLimit: queryItemCount,
        currentPageNumber: isPageValid ? page : 1,
        totalPages: Math.ceil(totalDocs / queryItemCount),
        totalDocs,
      },
    };
  } catch (error: any) {
    logger(
      responseType.DATABASE_ERROR.type,
      `Unable to search users | Error: ${error.message}`
    );
    throw error;
  }
};

export const User = model<IUser, IUserModel, {}>("User", UserSchema);
