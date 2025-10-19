import { Router } from 'express';
import { prisma } from '../db';
import fs from 'fs';

export const assetsRouter = Router();

assetsRouter.get('/:id/meta', async (req, res) => {
  const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
  if (!asset) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Asset not found' } });
  }
  res.json({
    id: asset.id,
    path: asset.path,
    mime: asset.mime,
    durationSec: asset.durationSec,
    sizeBytes: asset.sizeBytes,
    meta: asset.meta ? JSON.parse(asset.meta) : null,
  });
});

assetsRouter.get('/:id', async (req, res) => {
  const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
  if (!asset) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Asset not found' } });
  }
  if (!asset.path.startsWith('s3://')) {
    try {
      await fs.promises.access(asset.path, fs.constants.R_OK);
    } catch {
      return res.status(500).json({ error: { code: 'ASSET_MISSING', message: 'Asset file missing' } });
    }
    const stream = fs.createReadStream(asset.path);
    stream.on('error', () => res.status(500).json({ error: { code: 'ASSET_READ_ERROR', message: 'Unable to read asset' } }));
    res.setHeader('Content-Type', asset.mime);
    return stream.pipe(res);
  }
  return res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'S3 streaming not implemented yet' } });
});
