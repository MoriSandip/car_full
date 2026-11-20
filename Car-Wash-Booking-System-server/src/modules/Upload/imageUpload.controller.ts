import httpStatus from 'http-status';
import catchAsync from '../../app/utils/catchAsync';
import sendResponse from '../../app/utils/sendResponse';
import { ImageUploadService } from './imageUpload.service';

const uploadImage = catchAsync(async (req, res) => {
  const result = await ImageUploadService.uploadImage(
    req.body.image,
    req.body.mimeType,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Image uploaded successfully.',
    data: result,
  });
});

export const ImageUploadController = { uploadImage };
