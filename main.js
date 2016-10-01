'use strict';
const HekBot = require('./bot.js');

const prefix = process.env.PREFIX || '!'; 
const soundFolder = process.env.SOUND_FOLDER || 'audio';
const maxQueueSize = process.env.MAX_QUEUE_SIZE || 10;

const bot = new HekBot(prefix, process.env.TOKEN, soundFolder, maxQueueSize);

bot.start();