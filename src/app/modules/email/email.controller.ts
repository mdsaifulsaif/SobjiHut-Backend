import { Request, Response } from 'express';
import { sendEmail } from './email.service';

export const handleContactForm = async (req: Request, res: Response) => {
  const { from_name, from_email, subject, message, phone } = req.body;

  try {

    const emailBody = `
      <h3>New Contact Message</h3>
      <p><strong>Name:</strong> ${from_name}</p>
      <p><strong>Email:</strong> ${from_email}</p>
      <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong> ${message}</p>
    `;

    await sendEmail(
      process.env.EMAIL_USER!, 
      `Contact Form: ${subject}`,
      emailBody
    );

    res.status(200).json({
      success: true,
      message: 'Email sent successfully from backend!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send email.',
      error,
    });
  }
};