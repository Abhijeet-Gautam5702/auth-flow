// Utility class to generate email using email-templates and relevant links

export class EmailGenerator {
  userVerification(link: string) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your AuthWave Account</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f9f9f9;
                    color: #333333;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                }
                .email-container {
                    width: 100%;
                    max-width: 600px;
                    background-color: #ffffff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    margin: 20px auto;
                }
                h1 {
                    color: #1a73e8;
                    font-size: 24px;
                    margin-bottom: 10px;
                }
                p {
                    font-size: 16px;
                    line-height: 1.6;
                }
                .button-link {
                    display: inline-block;
                    padding: 12px 24px;
                    margin: 20px 0;
                    background-color: #1a73e8;
                    color: #ffffff;
                    text-decoration: none;
                    font-weight: bold;
                    border-radius: 6px;
                    transition: background-color 0.3s;
                }
                .button-link:hover {
                    background-color: #000000; /* Black on hover */
                    color: #ffffff; /* White text */
                }
                footer {
                    font-size: 12px;
                    color: #666666;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <h1>Welcome to AuthWave!</h1>
                <p>Hello,</p>
                <p>Thank you for registering with AuthWave! To complete your account setup, please verify your email address by clicking the link below.</p>
                <a href="${link}" class="button-link">Verify Your Account</a>
                <p><strong>Note:</strong> This verification link will be valid for the next <strong>15 minutes</strong> only.</p>
                <p>If you did not request this verification, please ignore this email.</p>
                <footer>Regards, <br> The AuthWave Team</footer>
            </div>
        </body>
        </html>
        `;
  }

  resetPassword(link: string) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your AuthWave Account</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f9f9f9;
                    color: #333333;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                }
                .email-container {
                    width: 100%;
                    max-width: 600px;
                    background-color: #ffffff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    margin: 20px auto;
                }
                h1 {
                    color: #1a73e8;
                    font-size: 24px;
                    margin-bottom: 10px;
                }
                p {
                    font-size: 16px;
                    line-height: 1.6;
                }
                .button-link {
                    display: inline-block;
                    padding: 12px 24px;
                    margin: 20px 0;
                    background-color: #1a73e8;
                    color: #ffffff;
                    text-decoration: none;
                    font-weight: bold;
                    border-radius: 6px;
                    transition: background-color 0.3s;
                }
                .button-link:hover {
                    background-color: #000000; /* Black on hover */
                    color: #ffffff; /* White text */
                }
                footer {
                    font-size: 12px;
                    color: #666666;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <h1>Welcome to AuthWave!</h1>
                <p>Hello,</p>
                <p>We received a request to reset your password for your AuthWave account. To proceed with resetting your password, please click the link below.</p>
                <a href="${link}" class="button-link">Reset your account password</a>
                <p><strong>Note:</strong> This reset link will be valid for the next <strong>15 minutes</strong> only.</p>
                <p>If you did not request this reset, please ignore this email.</p>
                <footer>Regards, <br> The AuthWave Team</footer>
            </div>
        </body>
        </html>
        `;
  }

  magicURLonEmail(link: string) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your AuthWave Account</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f9f9f9;
                    color: #333333;
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                }
                .email-container {
                    width: 100%;
                    max-width: 600px;
                    background-color: #ffffff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    margin: 20px auto;
                }
                h1 {
                    color: #1a73e8;
                    font-size: 24px;
                    margin-bottom: 10px;
                }
                p {
                    font-size: 16px;
                    line-height: 1.6;
                }
                .button-link {
                    display: inline-block;
                    padding: 12px 24px;
                    margin: 20px 0;
                    background-color: #1a73e8;
                    color: #ffffff;
                    text-decoration: none;
                    font-weight: bold;
                    border-radius: 6px;
                    transition: background-color 0.3s;
                }
                .button-link:hover {
                    background-color: #000000; /* Black on hover */
                    color: #ffffff; /* White text */
                }
                footer {
                    font-size: 12px;
                    color: #666666;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <h1>Welcome to AuthWave!</h1>
                <p>Hello,</p>
                <p>Thank you for registering with AuthWave! To complete your authentication setup via Magic-URL, please click the link below.</p>
                <a href="${link}" class="button-link">Complete Magic-URL Authentication</a>
                <p><strong>Note:</strong> This link will be valid for the next <strong>15 minutes</strong> only.</p>
                <p>If you did not request this, please ignore this email.</p>
                <footer>Regards, <br> The AuthWave Team</footer>
            </div>
        </body>
        </html>
        `;
  }

  OTPonEmail(link: string) {}

  userLimitExceeded(link: string) {}

  userSessionLimitExceeded(link: string) {}
}

export const emailGenerator = new EmailGenerator();
