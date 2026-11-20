import config from '../../app/config';
export type UserS = {
  email: string;
  userId: string;
};
export const initiatePayment = async (data: {
  totalPrice: number;
  user: UserS;
  totalHoursInDecimal: number;
  tranId: string;
}) => {
  const { totalPrice, user, totalHoursInDecimal, tranId } = data;
  const amount = totalPrice.toFixed(2);

  if (!Number.isFinite(totalPrice) || Number(amount) <= 0) {
    throw new Error('Invalid total price provided for payment.');
  }
  if (!config.api_public_url) {
    throw new Error('The public payment callback URL is not configured.');
  }
  const publicApiUrl = new URL(config.api_public_url);
  if (
    publicApiUrl.protocol !== 'https:' &&
    !(config.NODE_ENV !== 'production' &&
      publicApiUrl.hostname === 'localhost')
  ) {
    throw new Error('The public payment callback URL must use HTTPS.');
  }
  const apiBase = publicApiUrl.toString().replace(/\/+$/, '');

  const paymentData = {
    store_id: config.amr_pay_id,
    signature_key: config.amr_pay_key,
    tran_id: tranId,
    success_url: `${apiBase}/api/v1/payment/conformation?tnxId=${encodeURIComponent(tranId)}`,
    fail_url: `${apiBase}/api/v1/payment/fail`,
    cancel_url: `${apiBase}/api/v1/payment/fail`,
    amount,
    currency: 'BDT',
    desc: 'Car wash booking payment',
    cus_name: user.email,
    cus_email: user.email,
    cus_add1: 'House B-158 Road 22',
    cus_add2: 'Mohakhali DOHS',
    totalHourse: totalHoursInDecimal,
    cus_city: 'Dhaka',
    cus_phone: '',
    cus_state: 'Dhaka',
    cus_postcode: '1206',
    cus_country: 'Bangladesh',
    type: 'json',
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('https://sandbox.aamarpay.com/jsonpost.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Payment provider returned ${response.status}.`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

export const VerifyPayment = async (tnxId: string) => {
  const queryParams = new URLSearchParams({
    store_id: config.amr_pay_id || '',
    signature_key: config.amr_pay_key || '',
    type: 'json',
    request_id: tnxId,
  }).toString();

  if (!config.amr_pay_verify_url) {
    throw new Error('Payment verification is not configured.');
  }
  const verifyUrl = new URL(config.amr_pay_verify_url);
  if (verifyUrl.protocol !== 'https:') {
    throw new Error('Payment verification URL must use HTTPS.');
  }
  const url = `${verifyUrl.toString()}?${queryParams}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error('Payment provider verification failed.');
  }
  const result = JSON.parse(responseText);

  if (!result || typeof result !== 'object') {
    throw new Error('Unexpected response format');
  }

  return result;
};
