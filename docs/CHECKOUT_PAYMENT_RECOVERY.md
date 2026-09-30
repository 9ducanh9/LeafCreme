# Checkout and payment recovery

## Rollout

1. Back up the database and run `python -m scripts.audit_order_payments` against the target environment. Review the output against inventory history and bank statements. Online orders with no payment can be legitimate COD orders; the report is not permission to cancel them.
2. Apply `alembic upgrade head` (revision `0017_checkout_sepay` adds `checkout_requests` and `sepay_transactions`). Deploy the backend before the frontend. Order reads, payment reads, and the POS creation route remain available; storefront order creation must use `/orders/checkout` and pre-orders must use `/orders/preorder-checkout`.
3. Configure all three required SePay settings: `SEPAY_BANK_ACCOUNT`, `SEPAY_BANK_CODE`, `SEPAY_WEBHOOK_API_KEY`. New QR checkout fails before reserving inventory if configuration is incomplete.
4. Deploy the storefront and verify customer polling, COD and QR checkout, retry after a lost response, cancellation, and reconciliation in a test environment.

The migration does not alter historical orders, inventory or bank receipts. Do not automatically repair old stock or infer a refund from a cancelled order. Reconcile those records manually using the audit report and bank statements. Never downgrade the new tables after accepting real receipts without exporting their audit records first.

## Checkout contract

`POST /orders/checkout` accepts the existing order fields plus `payment_method` (`pay_later` or `sepay_qr`) and a required `Idempotency-Key` header (1–128 characters). It returns HTTP 201 with `{order, payment_info, payment_status}`; `payment_status` is `paid`, `pending`, or `unpaid`. Replaying an identical request for the same user/key returns the existing order and its current pending QR, if any. Changed content returns HTTP 409. Cancelled or completed orders are not recreated by replay. Direct creation of online orders is rejected so online checkout cannot bypass the idempotency and payment flow.

Staff create a new pre-order through `POST /orders/preorder-checkout` with the same idempotency requirement. The admin form stores the exact request and key per staff account before sending and reuses them after an uncertain response or page reload. It always creates a full-amount SePay QR when the payable amount is greater than zero; deposits are rejected. Zero-payable orders do not need a transfer. The generic `POST /orders` route is reserved for POS orders.

Payment confirmation and handover are separate. A valid SePay callback records a successful payment but leaves the order in processing. An unpaid pre-order stays in `cho`; a successful callback advances it to processing only when the full amount is paid. New pre-orders cannot enter processing or delivery until then. A manager can mark pickup as `hoan_thanh` only after full payment, which attests that the customer received it. Delivery orders must move through `dang_giao` before `hoan_thanh`; orders using SePay cannot dispatch until their balance is fully paid. For POS and COD, the order detail page lets staff record cash actually received; managers then confirm handover separately. Pre-orders do not accept manual cash. Bank transfers cannot be manually marked successful or verified through the generic payment endpoints; they must match the unique payment code and amount through SePay. The admin order detail page can create or reopen that order's QR.

Order creation, inventory allocation, voucher use, pending SePay payment and the checkout key are committed together. The browser persists the key and the exact request per account before sending and reuses them on retry/reload. If browser storage is unavailable, checkout does not start.

`GET /payments/{id}` and `GET /payments/orders/{order_id}` require authentication and enforce order ownership. Management can access all orders; staff retain access only to their own created/owned orders. A payment response includes `order_status` and `reconciliation_status` (`none`, `refund_required`, `refunded`).

## Late or unmatched money

The webhook records every authenticated incoming transfer to the configured account once, using the SePay transaction ID. Correct receipts for active pending payments confirm payment. Cancelled orders, inactive payments, wrong amounts and additional transfers are persisted for reconciliation. Unknown codes are recorded as unmatched. A database failure returns an error rather than acknowledging an unsaved receipt.

Cancelled orders stay cancelled, with inventory released. The late receipt is not treated as a normal successful order payment. Repeated webhook deliveries do not create additional receipts or inventory movements.

Admin/manager users open **Đối soát thanh toán** at `/admin/payment-reconciliation`. After refunding the customer through the bank, record the refund reference and note. Confirmation only writes an audit record; it does not transfer funds. The server stores the operator and timestamp and rejects conflicting repeat confirmations.

The management APIs are `GET /payments/sepay/reconciliation?skip=0&limit=25&status=refund_required` and `POST /payments/sepay/reconciliation/{transaction_id}/refund-confirmation` with `{refund_reference, refund_note}`. Omitting the status filter lists refund-required and unmatched receipts. Raw bank payloads are retained server-side and excluded from these responses.

## Monitoring and checks

- Investigate `Checkout replay` events if a user repeatedly cannot finish checkout.
- Monitor webhook errors and `SePay reconciliation` warning logs. Logs include receipt ID/reason without the API key or full bank payload.
- Customer-owned payment polling should return 200, never a role-related 403.
- Watch the reconciliation queue and unresolved refund-required receipts.
- Run `pytest` against a disposable PostgreSQL database containing `test` in its name. Tests apply/downgrade migrations and must not use production or staging.
- Frontend: `npm test -- --run`, `npm run lint`, `npm run build`, and `npm run test:e2e`.
