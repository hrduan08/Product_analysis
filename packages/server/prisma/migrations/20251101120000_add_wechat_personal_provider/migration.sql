-- Add new payment provider enum value for personal WeChat collection codes
ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'wechat_personal';
