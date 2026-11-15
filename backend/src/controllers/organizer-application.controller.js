import { OrganizerApplicationService } from '../services/organizer-application.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class OrganizerApplicationController {
  /**
   * Submits a new organizer application for the authenticated user.
   */
  static async submitApplication(req, res, next) {
    try {
      const application = await OrganizerApplicationService.submitApplication(
        req.user,
        req.body
      );

      return ApiResponse.success(res, {
        statusCode: 201,
        message: 'Organizer application submitted successfully',
        data: { application },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieves the authenticated user's organizer application status and history.
   */
  static async getMyApplications(req, res, next) {
    try {
      const result = await OrganizerApplicationService.getMyApplications(
        req.user._id,
        req.query
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Organizer applications retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

