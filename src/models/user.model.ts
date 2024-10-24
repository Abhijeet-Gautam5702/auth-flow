import { model, Schema } from "mongoose";
import { IUser, IUserMethods, IUserModel } from "../types/types";
import bcrypt from "bcrypt";
import { logger } from "../utils/logger";
import { responseType } from "../constants";

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
      unique: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpiry: Date,

    resetPasswordToken: String,
    resetPasswordTokenExpiry: Date,
  },
  { timestamps: true, validateBeforeSave: true }
);

// Hash the password everytime before saving
UserSchema.pre("save", async function () {
  try {
    // Hash the password only if it was modified
    if (this.isModified("password")) {
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
  try {
    const isPasswordCorrect = await bcrypt.compare(password, this.password);
    return isPasswordCorrect;
  } catch (error) {
    logger(
      responseType.DATABASE_ERROR.type,
      "The password could not be compared with the hashed password stored in database"
    );
    throw error;
  }
};

export const User = model<IUser>("User", UserSchema);
