// Utility functions to validate the structure of the config-object(s) sent in the HTTP request

import { responseType } from "../constants";
import { ApiError } from "./custom-api-error";

// Helper function: Check for extra keys
const checkForExtraKeys = (obj: any, validKeys: any) => {
  for (const key of Object.keys(obj)) {
    if (!(key in validKeys)) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        `The field "${key}" is not defined in the structure of the object.`
      );
    }
  }
};

// Helper function: Check for missing required keys
const checkForMissingKeys = (obj: any, requiredKeys: any) => {
  for (const key of Object.keys(requiredKeys)) {
    if (!(key in obj)) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        `The field "${key}" is a required field and not provided in the object.`
      );
    }
  }
};

// Helper function: Check that each field matches the expected type
const checkFieldType = (obj: any, validKeys: any) => {
  for (const key of Object.keys(obj)) {
    const expectedType = validKeys[key];
    if (typeof obj[key] !== expectedType) {
      throw new ApiError(
        responseType.INVALID_FORMAT.code,
        responseType.INVALID_FORMAT.type,
        `The field "${key}" should be of type ${expectedType}, but got ${typeof obj[
          key
        ]}.`
      );
    }
  }
};

// Utility: Function to validate the ProjectConfig object
export const validateProjectConfig = (config: any): boolean => {
  validateLoginMethods(config.loginMethods);
  if (config.emailTemplates) {
    validateEmailTemplates(config.emailTemplates);
  }
  if (config.security) {
    validateSecurityObject(config.security);
  }
  return true;
};

// Utility: Function to validate the LoginMethods object
export const validateLoginMethods = (loginMethods: any): boolean => {
  // Define the expected keys and their types
  const requiredKeys: { [key: string]: string } = {
    emailPassword: "boolean",
  };
  const optionalKeys: { [key: string]: string } = {
    OTPonEmail: "boolean",
    OTPonMobile: "boolean",
    magicURLonEmail: "boolean",
  };

  const validKeys = { ...requiredKeys, ...optionalKeys };

  checkForExtraKeys(loginMethods, validKeys);
  checkForMissingKeys(loginMethods, requiredKeys);
  checkFieldType(loginMethods, validKeys);

  // If all checks pass, return true
  return true;
};

// Utility: Function to validate the Security object
export const validateSecurityObject = (security: any): boolean => {
  // Define the expected keys and their types
  const requiredKeys: { [key: string]: string } = {};
  const optionalKeys: { [key: string]: string } = {
    userLimit: "number",
    userSessionLimit: "number",
  };

  const validKeys = { ...requiredKeys, ...optionalKeys };

  checkForExtraKeys(security, validKeys);
  checkForMissingKeys(security, requiredKeys);
  checkFieldType(security, validKeys);

  // If all checks pass, return true
  return true;
};

// Utility: Function to validate the Security object
export const validateEmailTemplates = (emailTemplates: any): boolean => {
  // Define the expected keys and their types
  const requiredKeys: { [key: string]: string } = {};
  const optionalKeys: { [key: string]: string } = {
    userVerification: "string",
    resetPassword: "string",
    userLimitExceeded: "string",
    userSessionLimitExceeded: "string",
    OTPonEmail: "string",
    magicURLonEmail: "string",
  };

  const validKeys = { ...requiredKeys, ...optionalKeys };

  checkForExtraKeys(emailTemplates, validKeys);
  checkForMissingKeys(emailTemplates, requiredKeys);
  checkFieldType(emailTemplates, validKeys);

  // If all checks pass, return true
  return true;
};
