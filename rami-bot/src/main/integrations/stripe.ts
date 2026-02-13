/**
 * Stripe Integration
 * Payment processing, subscriptions, invoices, etc.
 */

import { settingsManager } from '../settings'

const STRIPE_API = 'https://api.stripe.com/v1'

async function getHeaders(): Promise<Record<string, string>> {
  const settings = await settingsManager.getSettings()
  const apiKey = settings.stripeSecretKey

  if (!apiKey) {
    throw new Error('Stripe API key not configured')
  }

  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  }
}

function toFormData(obj: Record<string, any>, prefix: string = ''): string {
  const params = new URLSearchParams()

  function addParam(key: string, value: any) {
    if (value === undefined || value === null) return
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([k, v]) => {
        addParam(`${key}[${k}]`, v)
      })
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        addParam(`${key}[${i}]`, v)
      })
    } else {
      params.append(key, String(value))
    }
  }

  Object.entries(obj).forEach(([key, value]) => {
    addParam(prefix ? `${prefix}[${key}]` : key, value)
  })

  return params.toString()
}

async function stripeRequest(endpoint: string, method: string = 'GET', data?: Record<string, any>): Promise<any> {
  const headers = await getHeaders()

  const options: RequestInit = {
    method,
    headers
  }

  if (data && method !== 'GET') {
    options.body = toFormData(data)
  }

  let url = `${STRIPE_API}${endpoint}`
  if (data && method === 'GET') {
    url += `?${toFormData(data)}`
  }

  const response = await fetch(url, options)
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error?.message || `Stripe API error: ${response.status}`)
  }

  return result
}

// ============ CUSTOMERS ============

export async function listCustomers(options?: { limit?: number; email?: string }) {
  return await stripeRequest('/customers', 'GET', options)
}

export async function createCustomer(data: {
  email?: string
  name?: string
  phone?: string
  description?: string
  metadata?: Record<string, string>
}) {
  return await stripeRequest('/customers', 'POST', data)
}

export async function getCustomer(customerId: string) {
  return await stripeRequest(`/customers/${customerId}`)
}

export async function updateCustomer(customerId: string, data: {
  email?: string
  name?: string
  phone?: string
  description?: string
  metadata?: Record<string, string>
}) {
  return await stripeRequest(`/customers/${customerId}`, 'POST', data)
}

export async function deleteCustomer(customerId: string) {
  return await stripeRequest(`/customers/${customerId}`, 'DELETE')
}

// ============ PRODUCTS ============

export async function listProducts(options?: { limit?: number; active?: boolean }) {
  return await stripeRequest('/products', 'GET', options)
}

export async function createProduct(data: {
  name: string
  description?: string
  active?: boolean
  metadata?: Record<string, string>
}) {
  return await stripeRequest('/products', 'POST', data)
}

export async function getProduct(productId: string) {
  return await stripeRequest(`/products/${productId}`)
}

export async function updateProduct(productId: string, data: {
  name?: string
  description?: string
  active?: boolean
}) {
  return await stripeRequest(`/products/${productId}`, 'POST', data)
}

// ============ PRICES ============

export async function listPrices(options?: { product?: string; limit?: number }) {
  return await stripeRequest('/prices', 'GET', options)
}

export async function createPrice(data: {
  product: string
  unit_amount: number
  currency: string
  recurring?: { interval: 'day' | 'week' | 'month' | 'year' }
}) {
  return await stripeRequest('/prices', 'POST', data)
}

export async function getPrice(priceId: string) {
  return await stripeRequest(`/prices/${priceId}`)
}

// ============ PAYMENT INTENTS ============

export async function createPaymentIntent(data: {
  amount: number
  currency: string
  customer?: string
  description?: string
  metadata?: Record<string, string>
  automatic_payment_methods?: { enabled: boolean }
}) {
  return await stripeRequest('/payment_intents', 'POST', data)
}

export async function getPaymentIntent(paymentIntentId: string) {
  return await stripeRequest(`/payment_intents/${paymentIntentId}`)
}

export async function confirmPaymentIntent(paymentIntentId: string, data?: {
  payment_method?: string
}) {
  return await stripeRequest(`/payment_intents/${paymentIntentId}/confirm`, 'POST', data)
}

export async function cancelPaymentIntent(paymentIntentId: string) {
  return await stripeRequest(`/payment_intents/${paymentIntentId}/cancel`, 'POST')
}

export async function listPaymentIntents(options?: { customer?: string; limit?: number }) {
  return await stripeRequest('/payment_intents', 'GET', options)
}

// ============ SUBSCRIPTIONS ============

export async function listSubscriptions(options?: { customer?: string; status?: string; limit?: number }) {
  return await stripeRequest('/subscriptions', 'GET', options)
}

export async function createSubscription(data: {
  customer: string
  items: Array<{ price: string; quantity?: number }>
  trial_period_days?: number
  metadata?: Record<string, string>
}) {
  return await stripeRequest('/subscriptions', 'POST', data)
}

export async function getSubscription(subscriptionId: string) {
  return await stripeRequest(`/subscriptions/${subscriptionId}`)
}

export async function updateSubscription(subscriptionId: string, data: {
  items?: Array<{ id?: string; price?: string; quantity?: number }>
  cancel_at_period_end?: boolean
  metadata?: Record<string, string>
}) {
  return await stripeRequest(`/subscriptions/${subscriptionId}`, 'POST', data)
}

export async function cancelSubscription(subscriptionId: string, options?: { invoice_now?: boolean; prorate?: boolean }) {
  return await stripeRequest(`/subscriptions/${subscriptionId}`, 'DELETE', options)
}

// ============ INVOICES ============

export async function listInvoices(options?: { customer?: string; status?: string; limit?: number }) {
  return await stripeRequest('/invoices', 'GET', options)
}

export async function createInvoice(data: {
  customer: string
  auto_advance?: boolean
  description?: string
  metadata?: Record<string, string>
}) {
  return await stripeRequest('/invoices', 'POST', data)
}

export async function getInvoice(invoiceId: string) {
  return await stripeRequest(`/invoices/${invoiceId}`)
}

export async function finalizeInvoice(invoiceId: string) {
  return await stripeRequest(`/invoices/${invoiceId}/finalize`, 'POST')
}

export async function payInvoice(invoiceId: string) {
  return await stripeRequest(`/invoices/${invoiceId}/pay`, 'POST')
}

export async function voidInvoice(invoiceId: string) {
  return await stripeRequest(`/invoices/${invoiceId}/void`, 'POST')
}

export async function sendInvoice(invoiceId: string) {
  return await stripeRequest(`/invoices/${invoiceId}/send`, 'POST')
}

// ============ INVOICE ITEMS ============

export async function createInvoiceItem(data: {
  customer: string
  price?: string
  amount?: number
  currency?: string
  description?: string
  invoice?: string
}) {
  return await stripeRequest('/invoiceitems', 'POST', data)
}

// ============ CHARGES ============

export async function listCharges(options?: { customer?: string; limit?: number }) {
  return await stripeRequest('/charges', 'GET', options)
}

export async function getCharge(chargeId: string) {
  return await stripeRequest(`/charges/${chargeId}`)
}

// ============ REFUNDS ============

export async function createRefund(data: {
  charge?: string
  payment_intent?: string
  amount?: number
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
}) {
  return await stripeRequest('/refunds', 'POST', data)
}

export async function listRefunds(options?: { charge?: string; limit?: number }) {
  return await stripeRequest('/refunds', 'GET', options)
}

// ============ CHECKOUT SESSIONS ============

export async function createCheckoutSession(data: {
  mode: 'payment' | 'subscription' | 'setup'
  success_url: string
  cancel_url: string
  line_items?: Array<{ price: string; quantity: number }>
  customer?: string
  customer_email?: string
}) {
  return await stripeRequest('/checkout/sessions', 'POST', data)
}

export async function getCheckoutSession(sessionId: string) {
  return await stripeRequest(`/checkout/sessions/${sessionId}`)
}

// ============ PAYMENT METHODS ============

export async function listPaymentMethods(customerId: string, type: string = 'card') {
  return await stripeRequest('/payment_methods', 'GET', { customer: customerId, type })
}

export async function attachPaymentMethod(paymentMethodId: string, customerId: string) {
  return await stripeRequest(`/payment_methods/${paymentMethodId}/attach`, 'POST', { customer: customerId })
}

export async function detachPaymentMethod(paymentMethodId: string) {
  return await stripeRequest(`/payment_methods/${paymentMethodId}/detach`, 'POST')
}

// ============ BALANCE ============

export async function getBalance() {
  return await stripeRequest('/balance')
}

export async function listBalanceTransactions(options?: { limit?: number; type?: string }) {
  return await stripeRequest('/balance_transactions', 'GET', options)
}

// ============ PAYOUTS ============

export async function listPayouts(options?: { limit?: number; status?: string }) {
  return await stripeRequest('/payouts', 'GET', options)
}

export async function createPayout(data: {
  amount: number
  currency: string
  description?: string
}) {
  return await stripeRequest('/payouts', 'POST', data)
}

// ============ WEBHOOKS ============

export async function listWebhookEndpoints() {
  return await stripeRequest('/webhook_endpoints')
}

export async function createWebhookEndpoint(data: {
  url: string
  enabled_events: string[]
  description?: string
}) {
  return await stripeRequest('/webhook_endpoints', 'POST', data)
}

// ============ COUPONS ============

export async function createCoupon(data: {
  percent_off?: number
  amount_off?: number
  currency?: string
  duration: 'forever' | 'once' | 'repeating'
  duration_in_months?: number
  name?: string
}) {
  return await stripeRequest('/coupons', 'POST', data)
}

export async function listCoupons() {
  return await stripeRequest('/coupons')
}

// ============ REPORTS ============

export async function getRevenueReport(options: { interval: 'day' | 'week' | 'month'; count?: number }) {
  // This is a simplified version - actual reporting requires Stripe Sigma or custom aggregation
  const charges = await listCharges({ limit: 100 })
  const subscriptions = await listSubscriptions({ limit: 100 })

  return {
    charges: charges.data?.length || 0,
    subscriptions: subscriptions.data?.length || 0,
    totalCharged: charges.data?.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0
  }
}

export async function test() {
  try {
    const balance = await getBalance()
    return { success: true, message: `Connected. Currency: ${balance.available[0]?.currency || 'N/A'}` }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
