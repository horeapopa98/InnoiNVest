const AppError = require('../errors/AppError');
const chatService = require('../services/chat.service');

async function handleChat(req, res) {
  const { message, history } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new AppError('message is required and must be a non-empty string', 400);
  }

  if (history !== undefined && !Array.isArray(history)) {
    throw new AppError('history must be an array if provided', 400);
  }

  const result = await chatService.chat(message.trim(), history || []);
  res.json(result);
}

module.exports = { handleChat };
