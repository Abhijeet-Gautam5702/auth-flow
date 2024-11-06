// Middleware to limit the API-requests from a particular IP-address
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../utils/async-handler";
import {
  IClientIP,
  IClientUID,
  IFailedAttemptInfo,
  IRequest,
} from "../types/types";
import { NextFunction, Response } from "express";
import { ApiError } from "../utils/custom-api-error";
import { responseType } from "../constants";

/* ------------------------ API RATE LIMITER CLASS ------------------------------------- */

class ApiRateLimiter {
  // Overall Rate Limiter for the entire app
  overall(interval: number, requestLimit: number) {
    return rateLimit({
      windowMs: interval,
      limit: requestLimit,
      handler: asyncHandler(
        async (req: IRequest, res: Response, next: NextFunction) => {
          throw new ApiError(
            responseType.API_LIMIT_EXCEEDED.code,
            responseType.API_LIMIT_EXCEEDED.type,
            "Too many requests from this IP-address. Please try again after some time"
          );
        }
      ),
    });
  }
}

export const apiRateLimiter = new ApiRateLimiter();

/* ------------------------ ACCOUNT LOCKOUT CLASS ------------------------------------- */

class AccountLockout {
  // NOTE: Private properties can not be a part of interfaces
  private maxFailedAttempts: number = 5;
  private lockoutDuration: number = 15 * 60 * 1000;
  private store: Map<IClientUID, IFailedAttemptInfo> = new Map<
    IClientUID,
    IFailedAttemptInfo
  >();

  private generateClientUID = (clientIP: IClientIP, clientEmail: string) => {
    return `${clientIP}:${clientEmail}`;
  };

  // Middleware method to check if the client-UID has been locked out from accessing login routes
  public checkFailedLoginAttempts = asyncHandler(
    async (req: IRequest, res: Response, next: NextFunction) => {
      // Get the client-IP and user-email
      const clientIP = req.ip;
      const { email } = req.body;
      if (!email) {
        throw new ApiError(
          responseType.INVALID_FORMAT.code,
          responseType.INVALID_FORMAT.type,
          "Email is not provided correctly in the Request-body."
        );
      }

      // Generate the Client-UID from client-IP and user-email
      const clientUID: IClientUID = this.generateClientUID(
        clientIP as string,
        email
      );

      // Get the lockout-info using the Client-UID from the store
      const accountLockoutInfo = this.store.get(clientUID);

      // No info in store OR failed-login-attempt count < maxLimit => Do nothing
      if (
        !accountLockoutInfo ||
        accountLockoutInfo.count < this.maxFailedAttempts
      ) {
        return next();
      }

      // Lockout expiry exists => Account may be locked
      if (accountLockoutInfo.lockoutExpiry) {
        // Lockout expiry finished => clear the account from the store
        if (accountLockoutInfo.lockoutExpiry < new Date()) {
          this.store.delete(clientUID);
          return next();
        }
        // Lockout expiry still remaining => Throw error response
        else {
          throw new ApiError(
            responseType.ACCOUNT_LOCKED.code,
            responseType.ACCOUNT_LOCKED.type,
            `Too many failed login attempts. Try again after ${
              accountLockoutInfo.lockoutExpiry.getMinutes() -
              new Date().getMinutes()
            } minutes.`
          );
        }
      }

      // Clear all the expired entries from the store
      this.clearExpiredAttemptInfo();

      return next();
    }
  );

  // Method to increment the number of failed login attempts from a Client-UID
  public handleFailedLoginAttempt = (clientIP: IClientIP, email: string) => {
    // Get the account-lockout-info from the store
    const clientUID = this.generateClientUID(clientIP, email);
    const accountLockoutInfo = this.store.get(clientUID);

    // First failed login attempt
    if (!accountLockoutInfo) {
      const failedAttemptInfo: IFailedAttemptInfo = {
        count: 1,
      };
      this.store.set(clientUID, failedAttemptInfo);
      return;
    }
    // Max Limit of failed login attempts finished
    else if (accountLockoutInfo.count === this.maxFailedAttempts - 1) {
      const failedAttemptInfo: IFailedAttemptInfo = {
        count: this.maxFailedAttempts,
        lockoutExpiry: new Date(new Date().getTime() + this.lockoutDuration),
      };
      this.store.set(clientUID, failedAttemptInfo);
      return;
    }

    // Increase the failed-login-attempt count by 1
    const failedAttemptCount: number = accountLockoutInfo.count;
    const failedAttemptInfo: IFailedAttemptInfo = {
      ...accountLockoutInfo,
      count: failedAttemptCount + 1,
    };
    this.store.set(clientUID, failedAttemptInfo);

    // Clear all the expired entries from the store
    this.clearExpiredAttemptInfo();

    return;
  };

  // Method to clear all the expired account-lockout-info from the store
  public clearExpiredAttemptInfo = () => {
    const now = new Date();
    for (const [clientUID, accountLockoutInfo] of this.store.entries()) {
      if (
        accountLockoutInfo.lockoutExpiry &&
        accountLockoutInfo.lockoutExpiry < now
      ) {
        this.store.delete(clientUID);
      }
    }
  };
}

export const accountLockout = new AccountLockout();
