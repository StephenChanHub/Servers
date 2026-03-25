import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { handleNetworkApiRequest } = require('./networkDiagnostics.cjs');

export const networkApiMiddleware = async (req, res, next) => {
  const handled = await handleNetworkApiRequest(req, res, req.url || '');
  if (handled) return;
  next();
};
