const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const chatController = require('../controllers/chat.controller');

const router = express.Router();

router.post('/', asyncHandler(chatController.handleChat));

module.exports = router;
