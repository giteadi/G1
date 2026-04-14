'use strict';

const express = require('express');
const router = express.Router();

const statusRoutes = require('./status');
const threatRoutes = require('./threats');
const chatRoutes = require('./chat');

router.use('/status', statusRoutes);
router.use('/threats', threatRoutes);
router.use('/chat', chatRoutes);

module.exports = router;
