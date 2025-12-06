import { Router } from 'express';
import multer from 'multer';

import { sendFeedbackToFeishu } from '../services/feedback.js';
import { uploadFeedbackFile } from '../services/storage.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const router = Router();

router.post('/feedback', async (req, res, next) => {
  try {
    await sendFeedbackToFeishu({
      userId: req.body.userId,
      anonymousId: req.body.anonymousId,
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
      contactEmail: req.body.contactEmail,
      attachments: req.body.attachments,
      diagnostics: req.body.diagnostics
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post('/feedback/attachments', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择要上传的文件' });
    }
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: '仅支持上传图片' });
    }
    const url = await uploadFeedbackFile({
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
      filename: req.file.originalname,
      prefix: 'attachments'
    });
    res.json({
      url,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    next(error);
  }
});

export default router;
