import nodeMailer, { Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { prisma } from "../../../prisma";

export async function forgotPassword(
  email: string,
  code: string,
  link: string,
  token: string
) {
  try {
    let mail: Transporter<SMTPTransport.SentMessageInfo>;
    let replyto: string | undefined;

    const emails = await prisma.email.findMany();
    const resetlink = `${link}/auth/reset-password?token=${token}`;

    if (emails.length > 0) {
      if (process.env.ENVIRONMENT === "development") {
        let testAccount = await nodeMailer.createTestAccount();
        mail = nodeMailer.createTransport({
          port: 1025,
          secure: false, // true for 465, false for other ports
          auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
          },
        });
      } else {
        const emailConfig = emails[0];
        replyto = emailConfig.reply;

        // Ensure that port is converted to a number if it's a string
        const smtpOptions: SMTPTransport.Options = {
          host: emailConfig.host,
          port: typeof emailConfig.port === 'string' ? parseInt(emailConfig.port, 10) : emailConfig.port,
          secure: emailConfig.secure, // true for 465, false for other ports
          auth: {
            user: emailConfig.user,
            pass: emailConfig.pass,
          },
        };

        mail = nodeMailer.createTransport(smtpOptions);
      }

      // Send the email
      const info = await mail.sendMail({
        from: '"Support" <support@example.com>', // sender address
        to: email, // list of receivers
        subject: "Password Reset", // Subject line
        text: `Use the following link to reset your password: ${resetlink}`, // plain text body
        html: `<p>Use the following link to reset your password:</p><a href="${resetlink}">Reset Password</a>`, // html body
        replyTo: replyto,
      });

      console.log("Message sent: %s", info.messageId);
      if ('pending' in info) {
        console.log("Pending status: %s", info.pending);
      }
    }
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Could not send the reset password email.");
  }
}
