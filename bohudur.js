const BASE_URL = "https://request.bohudur.one"

/*
 * Bohudur Payment Gateway Client
 *
 * @param {string} apiKey   - Your Bohudur API key (AH-BOHUDUR-API-KEY)
 * @param {string} version  - API version to use (e.g. "v2", "v3")
 *
 * @example
 * import Bohudur from "./bohudur.js"
 * const bohudur = Bohudur(process.env.BOHUDUR_KEY, "v2")
 */
export default function Bohudur(apiKey, version) {
  //─── Initialisation Warnings (Supabase-style) ───
  if (!apiKey && !version) {
    console.error(
      "Bohudur: apiKey and version are required.\n" +
      "  const bohudur = Bohudur('your-api-key', 'v2')\n" +
      "  Docs: https://docs.bohudur.one/curl"
    )
    return null
  }
  if (!apiKey) {
    console.error(
      "Bohudur: apiKey is required.\n" +
      "  const bohudur = Bohudur('your-api-key', '" + version + "')\n" +
      "  Docs: https://docs.bohudur.one/curl"
    )
    return null
  }
  if (!version) {
    console.error(
      "Bohudur: version is required.\n" +
      "  const bohudur = Bohudur(apiKey, 'v2')\n" +
      "  Docs: https://docs.bohudur.one/curl"
    )
    return null
  }
  
  //─── Internal Request Handler ───
  //
  // All three methods (create, execute, query) share the same structure:
  //   POST https://request.bohudur.one/{endpoint}/{version}/
  //   Headers: Content-Type + AH-BOHUDUR-API-KEY
  //   Body: JSON
  //
  // Error handling strategy:
  //   - Network/fetch failures  → caught, re-thrown with a clear message
  //   - Bohudur API errors      → returned as-is (responseCode !== 200)
  //     Callers should check response.responseCode or response.status
  //     since Bohudur always returns 200 HTTP but uses responseCode inside JSON
  
  async function request(endpoint, body) {
    try {
      const res = await fetch(`${BASE_URL}${endpoint}/${version}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "AH-BOHUDUR-API-KEY": apiKey
        },
        body: JSON.stringify(body)
      })
      return await res.json()
    } catch (error) {
      throw new Error(`Bohudur: Request to "${endpoint}" failed — ${error.message}`)
    }
  }
  
  // ─── Public API ───
  
  return {
    /*
     * Create a new payment session.
     *
     * @param {Object}  options
     * @param {string}  options.full_name    - Customer full name
     * @param {string}  options.email        - Customer email address
     * @param {number}  options.amount       - Payment amount
     * @param {string}  options.return_type  - "GET" or "POST"
     * @param {string}  options.redirect_url - URL to redirect after success
     * @param {string}  options.cancel_url   - URL to redirect after cancel
     * @param {Object}  [options.metadata]   - Optional custom key-value data
     * @param {Object}  [options.webhook]    - Optional webhook URLs
     * @param {string}  [options.webhook.success] - Webhook URL on success
     * @param {string}  [options.webhook.cancel]  - Webhook URL on cancel
     *
     * @returns {Promise<{
     *   responseCode: number,
     *   message:      string,
     *   status:       string,
     *   paymentkey:   string,
     *   payment_url:  string
     * }>}
     *
     * @example
     * const data = await bohudur.create({
     *   full_name:    "Jane Doe",
     *   email:        "jane@example.com",
     *   amount:       10,
     *   return_type:  "POST",
     *   redirect_url: "https://yourapp.com/success",
     *   cancel_url:   "https://yourapp.com/cancel",
     *   webhook: {
     *     success: "https://yourapp.com/webhook/success",
     *     cancel:  "https://yourapp.com/webhook/cancel"
     *   }
     * })
     * if (data.responseCode !== 200) throw new Error(data.message)
     * // data.payment_url → redirect user here
     * // data.paymentkey  → store this for later execute/query
     */
    create: (options) => request("/create", options),
    
    /*
     * Execute (finalize) a completed payment.
     * Can only be called once per paymentkey.
     *
     * @param {string} paymentkey - The payment key from create()
     *
     * @returns {Promise<{
     *   full_name:         string,
     *   email:             string,
     *   amount:            number,
     *   converted_amount:  number,
     *   total_amount:      number,
     *   transaction_fee:   number,
     *   default_currency:  string,
     *   payment_currency:  string,
     *   currency_value:    number,
     *   metadata:          Array,
     *   created_time:      string,
     *   payment_time:      string,
     *   paymentkey:        string,
     *   webhook:           Array,
     *   payment_info:      Object,
     *   status:            string
     * }>}
     *
     * @example
     * const data = await bohudur.execute(paymentkey)
     * if (data.status !== "EXECUTED") throw new Error("Execution failed")
     */
    execute: (paymentkey) => request("/execute", { paymentkey }),
    
    /*
     * Query the status and full details of a payment.
     *
     * @param {string} paymentkey - The payment key from create()
     *
     * @returns {Promise<{
     *   status: "PENDING" | "COMPLETED" | "EXECUTED" | "CANCELLED",
     *   full_name:        string,
     *   email:            string,
     *   amount:           number,
     *   converted_amount: number,
     *   total_amount:     number,
     *   transaction_fee:  number,
     *   default_currency: string,
     *   payment_currency: string,
     *   currency_value:   number,
     *   metadata:         Array,
     *   created_time:     string,
     *   payment_time:     string,
     *   paymentkey:       string,
     *   webhook:          Array,
     *   payment_info:     Array | Object
     * }>}
     *
     * @example
     * const data = await bohudur.query(paymentkey)
     * console.log(data.status) // "PENDING" | "COMPLETED" | "EXECUTED" | "CANCELLED"
     */
    query: (paymentkey) => request("/query", { paymentkey })
  }
}