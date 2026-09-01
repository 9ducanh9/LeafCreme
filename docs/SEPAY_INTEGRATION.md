# SePay/VietQR integration

Leaf Creme generates an order-specific VietQR containing the exact amount and
payment code. SePay then confirms an incoming transfer through an authenticated
webhook. No receiving account or API key is committed to Git.

## Runtime variables

Configure these values on the backend service:

```env
SEPAY_BANK_ACCOUNT=your_receiving_account
SEPAY_BANK_CODE=your_bank_code
SEPAY_ACCOUNT_NAME=YOUR ACCOUNT NAME
SEPAY_WEBHOOK_API_KEY=one_random_secret_shared_with_sepay
```

`SEPAY_QR_BASE_URL` is optional and defaults to `https://vietqr.app/img`.

## SePay webhook

Create an incoming-transfer webhook in SePay:

- URL: `https://api-production-3f93.up.railway.app/payments/sepay/webhook`
- Event: incoming transfers only
- Authentication: API Key
- Header format sent by SePay: `Authorization: Apikey <key>`
- Content type: JSON
- Payment-code prefix: `LC`

The API key configured in SePay must exactly match `SEPAY_WEBHOOK_API_KEY` on
Railway. Duplicate notifications are safe: Leaf Creme deduplicates them using
the SePay transaction ID stored in `thanhtoan.ma_giao_dich`.

Before accepting real payments, use SePay's webhook test function and verify
that the endpoint returns HTTP 200 with `{ "success": true }`.
