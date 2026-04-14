'use strict';

const express = require('express');
const router = express.Router();

const statusRoutes = require('./status');
const threatRoutes = require('./threats');
const chatRoutes = require('./chat');
const learningRoutes = require('./learning');
const scanRoutes = require('./scan');

router.use('/status', statusRoutes);
router.use('/threats', threatRoutes);
router.use('/chat', chatRoutes);
router.use('/learning', learningRoutes);
router.use('/scan', scanRoutes);

module.exports = router;
