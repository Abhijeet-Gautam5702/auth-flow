import { Resend } from "resend";
import {
  env,
  frontendDomain,
  ORG_EMAIL,
  ORG_NAME,
  responseType,
} from "../constants";
import { ApiError } from "../utils/custom-api-error";
import { logger } from "../utils/logger";

export class Email {
  private resend = new Resend(env.secret.resendApiKey);
  private organization = `${ORG_NAME} <${ORG_EMAIL}>`;

  private _helperEmail = (
    title: string,
    message: string,
    buttonText: string,
    link?: string
  ) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            /* Base styles */
            .email-body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
            }

            /* Container styles */
            .email-wrapper {
                width: 100%;
                border-collapse: collapse;
            }

            .email-container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }

            /* Header styles */
            .email-header {
                padding: 40px 30px;
                text-align: center;
            }

            .header-title {
                color: #2563eb;
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }

            /* Content styles */
            .email-content {
                padding: 0 30px 30px;
            }

            .content-message {
                color: #555555;
                font-size: 16px;
                line-height: 1.6;
                margin: 0 0 20px;
            }

            /* Button styles */
            .button-wrapper {
                width: 100%;
                border-collapse: collapse;
                padding: 20px 0;
                text-align: center;
                margin-bottom: 20px; /* Added margin for spacing */
            }

            .action-button {
                display: inline-block;
                padding: 14px 30px;
                background-color: #2563eb;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                text-transform: uppercase;
                font-size: 14px;
                transition: background-color 0.3s ease;
            }

            .action-button:hover {
                background-color: #1d4ed8;
            }

            /* Note styles */
            .note-section {
                color: #4a4a4a;
                font-size: 14px;
                line-height: 1.4;
                margin: 0 0 20px;
                padding: 15px;
                background-color: #f8f8f8;
                border-radius: 4px;
                font-weight: 500;
            }

            .note-heading {
                font-weight: 700;
                color: #333333;
            }

            /* Footer styles */
            .email-footer {
                padding: 30px;
                background-color: #f8f8f8;
                border-bottom-left-radius: 8px;
                border-bottom-right-radius: 8px;
            }

            .footer-text {
                color: #666666;
                font-size: 14px;
                line-height: 1.4;
                margin: 0;
            }

            /* Responsive styles */
            @media only screen and (max-width: 600px) {
                .email-container {
                    width: 100% !important;
                    margin: 0 !important;
                }
                
                .email-content {
                    padding: 0 20px 20px;
                }
                
                .email-header {
                    padding: 30px 20px;
                }
                
                .header-title {
                    font-size: 24px;
                }
                
                .action-button {
                    padding: 12px 25px;
                    font-size: 13px;
                }
                
                .note-section {
                    padding: 12px;
                }
            }

            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .email-body {
                    background-color: #2d2d2d;
                }

                .email-container {
                    background-color: #1a1a1a;
                }

                .header-title {
                    color: #3b82f6;
                }

                .content-message {
                    color: #e0e0e0;
                }

                .note-section {
                    background-color: #2d2d2d;
                    color: #e0e0e0;
                }

                .note-heading {
                    color: #ffffff;
                }

                .email-footer {
                    background-color: #2d2d2d;
                }

                .footer-text {
                    color: #e0e0e0;
                }
            }
        </style>
    </head>
    <body class="email-body">
        <table class="email-wrapper" role="presentation">
            <tr>
                <td>
                    <table class="email-container" role="presentation">
                        <!-- Header -->
                        <tr>
                            <td class="email-header">
                                <h1 class="header-title">Welcome to AuthWave</h1>
                            </td>
                        </tr>

                        <!-- Main Content -->
                        <tr>
                            <td class="email-content">
                                <p class="content-message">
                                    ${message}
                                </p>

                                <!-- Button -->
                                <table class="button-wrapper" role="presentation">
                                    <tr>
                                        <td>
                                            <a href="${link}" class="action-button">
                                                ${buttonText}
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Note -->
                                <p class="note-section">
                                    <span class="note-heading">NOTE:</span> This will be valid for the next 15 minutes only.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td class="email-footer">
                                <p class="footer-text">
                                    Best regards,<br>
                                    The AuthWave Team
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
`;
  };

  private _helperWarningEmail = (
    title: string,
    message: string,
    buttonText: string,
    link: string,
    project: {
      id: string;
      name: string;
    }
  ) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
            /* Base styles */
            .email-body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
            }

            /* Container styles */
            .email-wrapper {
                width: 100%;
                border-collapse: collapse;
            }

            .email-container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }

            /* Header styles */
            .email-header {
                padding: 40px 30px;
                text-align: center;
            }

            .header-title {
                color: #dc2626; /* Changed to red */
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }

            /* Content styles */
            .email-content {
                padding: 0 30px 30px;
            }

            .content-message {
                color: #555555;
                font-size: 16px;
                line-height: 1.6;
                margin: 0 0 20px;
            }

            /* Button styles */
            .button-wrapper {
                width: 100%;
                border-collapse: collapse;
                padding: 20px 0;
                text-align: center;
                margin-bottom: 20px; /* Added margin for spacing */
            }

            .action-button {
                display: inline-block;
                padding: 14px 30px;
                background-color: #dc2626; /* Changed to red */
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                text-transform: uppercase;
                font-size: 14px;
                transition: background-color 0.3s ease;
            }

            .action-button:hover {
                background-color: #b91c1c; /* Darker red on hover */
            }

            /* Note styles */
            .note-section {
                color: #4a4a4a;
                font-size: 14px;
                line-height: 1.4;
                margin: 0 0 20px;
                padding: 15px;
                background-color: #fef2f2; /* Light red background */
                border-radius: 4px;
                font-weight: 500;
            }

            .note-heading {
                font-weight: 700;
                color: #dc2626; /* Changed to red */
            }

            /* Footer styles */
            .email-footer {
                padding: 30px;
                background-color: #f8f8f8;
                border-bottom-left-radius: 8px;
                border-bottom-right-radius: 8px;
            }

            .footer-text {
                color: #666666;
                font-size: 14px;
                line-height: 1.4;
                margin: 0;
            }

            /* Responsive styles */
            @media only screen and (max-width: 600px) {
                .email-container {
                    width: 100% !important;
                    margin: 0 !important;
                }
                
                .email-content {
                    padding: 0 20px 20px;
                }
                
                .email-header {
                    padding: 30px 20px;
                }
                
                .header-title {
                    font-size: 24px;
                }
                
                .action-button {
                    padding: 12px 25px;
                    font-size: 13px;
                }
                
                .note-section {
                    padding: 12px;
                }
            }

            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .email-body {
                    background-color: #2d2d2d;
                }

                .email-container {
                    background-color: #1a1a1a;
                }

                .header-title {
                    color: #ef4444; /* Adjusted red for dark mode */
                }

                .content-message {
                    color: #e0e0e0;
                }

                .note-section {
                    background-color: #402626; /* Darker red background for dark mode */
                    color: #e0e0e0;
                }

                .note-heading {
                    color: #ef4444; /* Adjusted red for dark mode */
                }

                .email-footer {
                    background-color: #2d2d2d;
                }

                .footer-text {
                    color: #e0e0e0;
                }
            }
        </style>
    </head>
    <body class="email-body">
        <table class="email-wrapper" role="presentation">
            <tr>
                <td>
                    <table class="email-container" role="presentation">
                        <!-- Header -->
                        <tr>
                            <td class="email-header">
                                <h1 class="header-title">⚠️ User Limit Reached</h1>
                            </td>
                        </tr>

                        <!-- Main Content -->
                        <tr>
                            <td class="email-content">
                                <p class="content-message">
                                    ${message}
                                </p>

                                <!-- Button -->
                                <table class="button-wrapper" role="presentation">
                                    <tr>
                                        <td>
                                            <a href="${link}" class="action-button">
                                                ${buttonText}
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Note -->
                                <p class="note-section">
                                    <span class="note-heading">IMPORTANT:</span> If no action is taken, new user registrations will be blocked until the limit is resolved.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td class="email-footer">
                                <p class="footer-text">
                                    Best regards,<br>
                                    The AuthWave Team
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
  };

  public send = async (
    email: string,
    subject: string,
    template: string
  ) => {
    const { data, error } = await this.resend.emails.send({
      from: this.organization,
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

  public userVerification = (link: string) => {
    return this._helperEmail(
      "Verify your AuthWave account",
      "Thank you for creating an account with AuthWave! To ensure the security of your account and access all features, please verify your email address by clicking the button below.",
      "Verify your email",
      link
    );
  };
  public resetPassword = (link: string) => {
    return this._helperEmail(
      "Password Reset Request for AuthWave Account",
      "We received a request to reset your password for your AuthWave account. To proceed with the password reset, please click the button below. (If you didn't request this change, you can safely ignore this email.)",
      "Reset Password",
      link
    );
  };
  public magicURLonEmail = (link: string) => {
    return this._helperEmail(
      "One-Click Login Link for AuthWave Authentication",
      "You've requested to sign in to your AuthWave account via Magic-URL. Click the button below to securely log in with one click.",
      "Click to Login",
      link
    );
  };
  public OTPonEmail = (password: string) => {
    return this._helperEmail(
      "One-Time Password for AuthWave Authentication",
      "Here's your one-time password (OTP) to access your AuthWave account. Enter this code to proceed with your authentication.",
      password
    );
  };

  public userLimitExceeded = (project: { id: string; name: string }) => {
    const message = `
        Your project "${project.name}" (ID: ${project.id}) has reached its maximum user limit on AuthWave. To ensure continued service and prevent any disruptions, immediate action is required.
        <br><br>
        You have two options to resolve this:
        <br>
        1. Increase your user limit through the developer console
        <br>
        2. Remove inactive user accounts to free up space
    `;

    return this._helperWarningEmail(
      "User Limit Reached",
      message,
      "Go to console",
      `${frontendDomain}/console/admin?id=adminId`, // TODO: Replace this with the URL to the developer-console after the AuthWave website is live.
      project
    );
  };
  
  public userSessionLimitExceeded = () => {};
}

export const emailService = new Email();
