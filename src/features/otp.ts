import * as bcrypt from "bcrypt";
import mongoose from "mongoose";
import { logger } from "../utils/logger";
import { responseType } from "../constants";
import { ApiError } from "../utils/custom-api-error";

export enum OtpPasswordType {
  numeric,
  alphabetical,
  alphaNumeric,
}

class OTP {
  // Private Static method to generate password with a specified number of digits
  /*
    NOTE-1: Private variables/methods can be accessed inside the class only. Each instance has its own copy of private variables.

    NOTE-2: Static variables/methods are defined on the whole class (rather than each instance of the class). All instances have a single shared static variable.
  */
  private static generatePassword = (
    type: OtpPasswordType,
    characters: number
  ) => {
    let pass = "";
    let auxillary = "";
    if (type === OtpPasswordType.alphaNumeric) {
      auxillary =
        "ab0cde1fghi5jkl2mnop3qrstuv4wxyzA6BCDE8FGHI9JKLMNO0PQRSTUVWXYZ";
    } else if (type === OtpPasswordType.numeric) {
      auxillary = "0987654321";
    } else {
      auxillary = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    }

    for (let i = 0; i < characters; i++) {
      pass += auxillary[Math.floor(Math.random() * auxillary.length)];
    }
    return pass;
  };

  // Authentication-related OTP methods
  public authentication = {
    generate: async (payload: {
      userId: mongoose.Types.ObjectId | string | undefined;
      projectId: mongoose.Types.ObjectId | string | undefined;
    }): Promise<object> => {
      try {
        const unhashedOTP = `${payload.userId}-${OTP.generatePassword(
          OtpPasswordType.alphaNumeric,
          8
        )}-${payload.projectId}`;
        const hashedOTP = await bcrypt.hash(unhashedOTP, 10);
        return {
          unhashedOTP,
          hashedOTP,
        };
      } catch (error: any) {
        logger(
          responseType.DATABASE_ERROR.type,
          "Password could not be hashed before saving"
        );
        throw error;
      }
    },
    decode: (otp: string) => {
      try {
        const parts: string[] = otp.split("-");
        if (parts.length !== 3) {
          throw new ApiError(
            responseType.INVALID_FORMAT.code,
            responseType.INVALID_FORMAT.type,
            "Authentication OTP doesn't contain all the required information"
          );
        }

        const [userIdString, password, projectIdString] = parts;

        const userId = new mongoose.Types.ObjectId(userIdString);
        const projectId = new mongoose.Types.ObjectId(projectIdString);

        return {
          userId,
          password,
          projectId,
        };
      } catch (error: any) {
        logger(
          responseType.UNSUCCESSFUL.type,
          "The Authentication OTP could not be decoded."
        );
        throw error;
      }
    },
    match: async (otp: string, hashedOTP: string) => {
      try {
        const isMatching = await bcrypt.compare(otp, hashedOTP);
        return isMatching;
      } catch (error: any) {
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
    },
  };
}

export const otp = new OTP();
