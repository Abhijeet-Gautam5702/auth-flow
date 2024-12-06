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
import { IProject } from "../types/types";

export class Email {
  private readonly resend = new Resend(env.secret.resendApiKey);
  private readonly organization = `${ORG_NAME} <${ORG_EMAIL}>`; // TODO: Remove after buying a Resend plan
  private readonly project: IProject;

  constructor(project: IProject) {
    this.project = project;
  }

  // Create an email from the custom template given by the admin (stored in the database)
  public createEmailFromCustomTemplate = (
    template: string,
    redirectURL?: string, // frontend URL where the user will be redirected upon clicking the link in the email
    otp?: string
  ) => {
    return template
      .replace("${link}", redirectURL || "")
      .replace("${otp}", otp || "");
  };

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
        body {
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            background-color: #f6f9fc;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* Container styles */
        .email-wrapper {
            width: 100%;
            border-collapse: collapse;
            background-color: #f6f9fc;
        }

        .email-container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }

        /* Header styles */
        .email-header {
            padding: 40px 30px;
            text-align: center;
            background-color: #2563eb;
        }

        .header-title {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }

        /* Content styles */
        .email-content {
            padding: 40px 30px;
        }

        .content-message {
            color: #4a5568;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 30px;
        }

        /* Button styles */
        .button-wrapper {
            width: 100%;
            border-collapse: collapse;
            padding: 20px 0 30px;
            text-align: center;
        }

        .action-button {
            display: inline-block;
            padding: 14px 30px;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            transition: background-color 0.3s ease;
            margin-bottom: 20px;
        }

        .action-button:hover {
            background-color: #1d4ed8;
        }

        /* Note styles */
        .note-section {
            color: #4a5568;
            font-size: 14px;
            line-height: 1.5;
            margin: 0 0 30px;
            padding: 15px;
            background-color: #f8fafc;
            border-radius: 6px;
            border-left: 4px solid #2563eb;
        }

        .note-heading {
            font-weight: 700;
            color: #2d3748;
        }

        /* Footer styles */
        .email-footer {
            padding: 30px;
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
        }

        .footer-text {
            color: #718096;
            font-size: 14px;
            line-height: 1.5;
            margin: 0;
        }

        /* Responsive styles */
        @media only screen and (max-width: 600px) {
            .email-container {
                width: 100% !important;
                margin: 0 !important;
            }
            
            .email-content, .email-header, .email-footer {
                padding: 30px 20px;
            }
            
            .header-title {
                font-size: 24px;
            }
            
            .action-button {
                padding: 12px 25px;
                font-size: 15px;
            }
            
            .note-section {
                padding: 12px;
            }
        }

        
        }
    </style>
</head>
<body>
    <table class="email-wrapper" role="presentation" cellspacing="0" cellpadding="0">
        <tr>
            <td align="center">
                <table class="email-container" role="presentation" cellspacing="0" cellpadding="0">
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
                            <table class="button-wrapper" role="presentation" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center">
                                        ${
                                          link
                                            ? `
                                                <a href="${link}" class="action-button">
                                                ${buttonText}
                                                <!--Verify your account-->
                                                </a>
                                            `
                                            : `
                                                <p class="action-button">
                                                ${buttonText}
                                                </p>
                                            `
                                        }
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
    buttonText?: string,
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
            body {
                margin: 0;
                padding: 0;
                font-family: 'Arial', sans-serif;
                background-color: #f6f9fc;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }

            /* Container styles */
            .email-wrapper {
                width: 100%;
                border-collapse: collapse;
                background-color: #f6f9fc;
            }

            .email-container {
                width: 100%;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
            }

            /* Header styles */
            .email-header {
                padding: 40px 30px;
                text-align: center;
                background-color: #dc2626;
            }

            .header-title {
                color: #ffffff;
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }

            /* Content styles */
            .email-content {
                padding: 40px 30px;
            }

            .content-message {
                color: #4a5568;
                font-size: 16px;
                line-height: 1.6;
                margin: 0 0 30px;
            }

            /* Button styles */
            .button-wrapper {
                width: 100%;
                border-collapse: collapse;
                padding: 20px 0 30px;
                text-align: center;
            }

            .action-button {
                display: inline-block;
                padding: 14px 30px;
                background-color: #dc2626;
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                font-size: 16px;
                transition: background-color 0.3s ease;
                margin-bottom: 20px;
            }

            .action-button:hover {
                background-color: #b91c1c;
            }

            /* Note styles */
            .note-section {
                color: #4a5568;
                font-size: 14px;
                line-height: 1.5;
                margin: 0 0 30px;
                padding: 15px;
                background-color: #fef2f2;
                border-radius: 6px;
                border-left: 4px solid #dc2626;
            }

            .note-heading {
                font-weight: 700;
                color: #dc2626;
            }

            /* Footer styles */
            .email-footer {
                padding: 30px;
                background-color: #f8fafc;
                border-top: 1px solid #e2e8f0;
            }

            .footer-text {
                color: #718096;
                font-size: 14px;
                line-height: 1.5;
                margin: 0;
            }

            /* Responsive styles */
            @media only screen and (max-width: 600px) {
                .email-container {
                    width: 100% !important;
                    margin: 0 !important;
                }
                
                .email-content, .email-header, .email-footer {
                    padding: 30px 20px;
                }
                
                .header-title {
                    font-size: 24px;
                }
                
                .action-button {
                    padding: 12px 25px;
                    font-size: 15px;
                    margin-bottom: 20px;
                }
                
                .note-section {
                    padding: 12px;
                }
            }
        </style>
    </head>
    <body>
        <table class="email-wrapper" role="presentation" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <table class="email-container" role="presentation" cellspacing="0" cellpadding="0">
                        <!-- Header -->
                        <tr>
                            <td class="email-header">
                                <h1 class="header-title">⚠️ Limit Reached</h1>
                            </td>
                        </tr>

                        <!-- Main Content -->
                        <tr>
                            <td class="email-content">
                                <p class="content-message">
                                    ${message}
                                </p>

                                ${
                                  buttonText && link
                                    ? `
                                <!-- Button -->
                                <table class="button-wrapper" role="presentation" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center">
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
                                    `
                                    : ``
                                }
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
    recipientEmail: string,
    subject: string,
    template: string
  ) => {
    const { data, error } = await this.resend.emails.send({
      from: this.organization, // TODO: Change this to  `this.project.appEmail` after buying a Resend plan and refistering the backend domain on Resend
      to: "abhidevelops572@gmail.com", // TODO: Change this to `recipientEmail` after buying a Resend plan and registering the backend domain on Resend
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
      "Verify your account",
      `Thank you for creating an account with our platform! To ensure the security of your account and access all features, please verify your email address by clicking the button below.`,
      "Verify your email",
      link
    );
  };

  public resetPassword = (link: string) => {
    return this._helperEmail(
      "Password Reset Request for your account",
      `We received a request to reset your password for your ${this.project.appName} account. To proceed with the password reset, please click the button below. (If you didn't request this change, you can safely ignore this email.)`,
      "Reset Password",
      link
    );
  };

  public magicURLonEmail = (link: string) => {
    return this._helperEmail(
      "One-Click Login Link for authentication",
      `You've requested to sign in to your ${this.project.appName} account via Magic-URL. Click the button below to securely log in with one click.`,
      "Click to Login",
      link
    );
  };

  public OTPonEmail = (password: string) => {
    return this._helperEmail(
      "One-Time Password for authentication",
      `Here's your one-time password (OTP) to access your ${this.project.appName} account. Enter this code to proceed with your authentication.`,
      password
    );
  };

  public userLimitExceeded = () => {
    const message = `
        Your application "${this.project.appName}" (Project-ID: ${this.project.id}) has reached its maximum user limit on AuthWave. To ensure continued service and prevent any disruptions, immediate action is required.
        <br><br>
        You have two options to resolve this. Head to the AuthWave developer console and:
        <br>
        1. Increase your user limit.
        <br>
        2. Remove inactive user accounts to free up space.
    `;

    return this._helperWarningEmail(
      "User Limit Reached",
      message,
      "Go to console",
      `${frontendDomain}/console/admin?id=adminId` // TODO: Replace this with the URL to the developer-console after the AuthWave website is live.
    );
  };

  public userSessionLimitExceeded = () => {
    const message = `
        You have exceeded the number of login sessions on the app: ${this.project.appName}. To ensure continued service and prevent any disruptions, immediate action is required.
        <br><br>
        You have two options to resolve this:
        <br>
        1. Contact the organization and increase the user session limit on their application
        <br>
        2. Log out from other devices and then try to login again
    `;
    return this._helperWarningEmail("User Session Limit reached", message);
  };
}
