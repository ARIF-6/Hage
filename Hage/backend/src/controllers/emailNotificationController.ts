import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { dbManager } from '../config/dbManager';
import nodemailer from 'nodemailer';

// ── Reuse the same cached transporter pattern from authController ──
let cachedTransporter: nodemailer.Transporter | null = null;

const getEmailTransporter = async (): Promise<nodemailer.Transporter | null> => {
  if (cachedTransporter) return cachedTransporter;

  const rawUser = (process.env.SMTP_USER || '').trim();
  const rawPass = (process.env.SMTP_PASS || '').trim();
  const pass = rawPass.replace(/\s+/g, '');
  const user = rawUser;

  if (user && pass) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      pool: true,
      maxConnections: 5,
    });
    return cachedTransporter;
  }

  // Ethereal fallback for dev
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    return cachedTransporter;
  } catch (e) {
    console.warn('Ethereal fallback unavailable:', e);
    return null;
  }
};

// ── Build a clean HTML email template ──
const buildEmailHtml = (subject: string, body: string, senderName: string): string => {
  const bodyHtml = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#080C16;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080C16;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:12px;">
                <div style="width:40px;height:40px;background:rgba(255,255,255,0.15);border-radius:12px;display:inline-block;line-height:40px;text-align:center;font-size:20px;font-weight:900;color:#fff;">H</div>
                <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">HAGE Platform</span>
              </div>
              <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:8px 0 0;text-transform:uppercase;letter-spacing:2px;">Official Admin Notification</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#0D1120;padding:36px 32px;border-left:1px solid rgba(79,70,229,0.15);border-right:1px solid rgba(79,70,229,0.15);">
              <h2 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 20px;line-height:1.3;">${subject}</h2>
              <div style="color:#94a3b8;font-size:15px;line-height:1.7;">${bodyHtml}</div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0a0f1e;border-radius:0 0 16px 16px;padding:20px 32px;border:1px solid rgba(79,70,229,0.12);border-top:none;text-align:center;">
              <p style="color:#475569;font-size:11px;margin:0;">
                This message was sent by <strong style="color:#6366f1;">${senderName}</strong> via the HAGE Admin Console.<br>
                © ${new Date().getFullYear()} HAGE Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// ── POST /api/admin/email/send ──
export const sendEmailNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      recipients,       // 'all' | 'selected'
      selectedUserIds,  // string[] — only used when recipients === 'selected'
      subject,
      body,
    } = req.body;

    if (!subject?.trim() || !body?.trim()) {
      res.status(400).json({ message: 'Subject and body are required.' });
      return;
    }

    if (!recipients || !['all', 'selected'].includes(recipients)) {
      res.status(400).json({ message: 'recipients must be "all" or "selected".' });
      return;
    }

    const store = dbManager.getStore();
    let targetUsers: any[] = store.users || [];

    if (recipients === 'selected') {
      if (!Array.isArray(selectedUserIds) || selectedUserIds.length === 0) {
        res.status(400).json({ message: 'Please select at least one user.' });
        return;
      }
      targetUsers = targetUsers.filter((u: any) => selectedUserIds.includes(u._id));
    }

    // Filter out suspended users and those without emails
    const validUsers = targetUsers.filter((u: any) => u.email && !u.isSuspended);

    if (validUsers.length === 0) {
      res.status(400).json({ message: 'No valid recipients found.' });
      return;
    }

    const transporter = await getEmailTransporter();
    if (!transporter) {
      res.status(500).json({ message: 'Email service is not configured. Please check SMTP settings.' });
      return;
    }

    const adminName = req.user?.name || 'HAGE Admin';
    const fromAddress = process.env.SMTP_USER || 'noreply@hagetrading.com';
    const htmlBody = buildEmailHtml(subject.trim(), body.trim(), adminName);

    // Send emails in parallel batches (max 10 at a time to avoid rate limiting)
    const BATCH_SIZE = 10;
    const results: { email: string; success: boolean; error?: string }[] = [];

    for (let i = 0; i < validUsers.length; i += BATCH_SIZE) {
      const batch = validUsers.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((user: any) =>
          transporter.sendMail({
            from: `"HAGE Platform" <${fromAddress}>`,
            to: user.email,
            subject: subject.trim(),
            html: htmlBody,
          })
        )
      );

      batchResults.forEach((result, idx) => {
        const user = batch[idx];
        if (result.status === 'fulfilled') {
          results.push({ email: user.email, success: true });
        } else {
          results.push({ email: user.email, success: false, error: result.reason?.message });
        }
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    // Log the notification to activity store
    const logEntry = {
      id: `email_notif_${Date.now()}`,
      adminId: req.user?._id || 'admin',
      adminName,
      action: 'Email Notification Sent',
      subject: subject.trim(),
      recipientCount: successCount,
      failedCount,
      sentAt: new Date().toISOString(),
    };

    if (!store.emailNotificationLogs) {
      (store as any).emailNotificationLogs = [];
    }
    (store as any).emailNotificationLogs.unshift(logEntry);
    dbManager.saveToDisk();

    res.status(200).json({
      success: true,
      message: `Email sent to ${successCount} user${successCount !== 1 ? 's' : ''}.${failedCount > 0 ? ` ${failedCount} failed.` : ''}`,
      successCount,
      failedCount,
      details: results,
    });
  } catch (error: any) {
    console.error('Email Notification Error:', error);
    res.status(500).json({ message: 'Failed to send email notifications.', error: error.message });
  }
};

// ── GET /api/admin/email/logs — fetch past notification history ──
export const getEmailNotificationLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const store = dbManager.getStore();
    const logs = (store as any).emailNotificationLogs || [];
    res.json(logs.slice(0, 50)); // last 50 campaigns
  } catch (error) {
    console.error('Get Email Logs Error:', error);
    res.status(500).json({ message: 'Failed to retrieve email logs.' });
  }
};

// ── GET /api/admin/email/preview-users — list users available as recipients ──
export const getEmailRecipients = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const store = dbManager.getStore();
    const users = (store.users || [])
      .filter((u: any) => u.email && !u.isSuspended)
      .map((u: any) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        subscriptionPlan: u.subscriptionPlan || 'Free',
        role: u.role,
      }));
    res.json(users);
  } catch (error) {
    console.error('Get Recipients Error:', error);
    res.status(500).json({ message: 'Failed to retrieve recipients.' });
  }
};
