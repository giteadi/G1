'use strict';

const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/ChatController');

router.post('/', ChatController.chat);
router.post('/analyze', ChatController.analyze);

module.exports = router;
