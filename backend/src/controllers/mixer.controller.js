import { MixerService } from '../services/mixer.service.js';
import { ApiResponse } from '../utils/api-response.js';

export class MixerController {
  static async getAvailability(req, res, next) {
    try {
      const result = await MixerService.getMixerAvailability(
        req.params.eventId,
        req.user._id
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Mixer availability retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAttendees(req, res, next) {
    try {
      const result = await MixerService.getEligibleAttendees(
        req.params.eventId,
        req.user._id,
        req.query
      );

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Eligible mixer attendees retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createTag(req, res, next) {
    try {
      const result = await MixerService.createPrivateTag(
        req.params.eventId,
        req.user._id,
        req.body.toUserId
      );

      return ApiResponse.success(res, {
        statusCode: 201,
        message: result.matched
          ? 'Mutual match unlocked! You both tagged each other.'
          : 'Attendee tagged privately',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyMatches(req, res, next) {
    try {
      const result = await MixerService.getMyMatches(req.user._id, req.query);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Mutual matches retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMatchById(req, res, next) {
    try {
      const result = await MixerService.getMatchById(req.params.matchId, req.user._id);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Match details retrieved successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

