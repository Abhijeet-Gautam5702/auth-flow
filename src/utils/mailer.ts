// Utility function to send emails
import { Resend } from "resend";
import { env, responseType } from "../constants";
import { logger } from "./logger";
import { ApiError } from "./custom-api-error";
import { IMailerInput } from "../types/types";

const resend = new Resend(env.secret.resendApiKey);

export const sendMail = async ({
  organization,
  userEmail,
  subject,
  template,
}: IMailerInput) => {
  const { data, error } = await resend.emails.send({
    from: organization,
    to: "abhidevelops572@gmail.com", // TODO: Change this to `userEmail` after buying a Resend plan and registering the backend domain on Resend
    subject: subject,
    html: template,
  });
  if (error) {
    logger(
      responseType.VALIDATION_ERROR.type,
      `Resend Service error | ${error.message}`
    );
    throw new ApiError(
      responseType.VALIDATION_ERROR.code,
      responseType.VALIDATION_ERROR.type,
      "Email could not be sent correctly.",
      error
    );
  }
  return data;
};
