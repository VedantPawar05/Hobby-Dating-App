import { ReportService } from '../services/report.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class ReportController {
  /**
   * Authenticated user submits a report against a user or event.
   */
  static async createReport(req, res, next) {
    try {
      const report = await ReportService.createReport(req.user._id, req.body);

      return ApiResponse.success(res, {
        statusCode: 201,
        message: 'Report submitted successfully for moderation review',
        data: { report },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves reports submitted by the authenticated user.
   */
  static async getMyReports(req, res, next) {
    try {
      const result = await ReportService.getMyReports(req.user._id, req.query);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Your submitted reports retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
