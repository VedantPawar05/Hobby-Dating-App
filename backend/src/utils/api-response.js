/**
 * Utility for formatting consistent JSON API responses.
 */
export class ApiResponse {
  /**
   * Send a successful JSON response.
   * @param {import('express').Response} res - Express response object
   * @param {Object} options - Response configuration
   * @param {number} [options.statusCode=200] - HTTP status code
   * @param {string} [options.message='Success'] - Response message
   * @param {any} [options.data=null] - Payload data
   */
  static success(res, { statusCode = 200, message = 'Success', data = null } = {}) {
    const payload = {
      success: true,
      message,
    };

    if (data !== null && data !== undefined) {
      payload.data = data;
    }

    return res.status(statusCode).json(payload);
  }

  /**
   * Send an error JSON response.
   * @param {import('express').Response} res - Express response object
   * @param {Object} options - Response configuration
   * @param {number} [options.statusCode=500] - HTTP status code
   * @param {string} [options.message='Internal Server Error'] - Error message
   * @param {any} [options.errors=null] - Error details or validation errors
   */
  static error(res, { statusCode = 500, message = 'Internal Server Error', errors = null } = {}) {
    const payload = {
      success: false,
      message,
    };

    if (errors !== null && errors !== undefined) {
      payload.errors = errors;
    }

    return res.status(statusCode).json(payload);
  }
}

