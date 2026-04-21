import twilio from "twilio";

export function getTwilioClient() {
  return twilio(
    process.env.TWILIO_API_KEY_SID!,
    process.env.TWILIO_API_KEY_SECRET!,
    { accountSid: process.env.TWILIO_ACCOUNT_SID! }
  );
}

export async function sendSms(to: string, body: string) {
  const client = getTwilioClient();
  return client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to,
  });
}
