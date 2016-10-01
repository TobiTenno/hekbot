'use strict';
const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');

class HekBot {
  constructor(prefix, token, soundPath, maxQueueSize) {
    this.prefix = prefix;
    this.token = token;
    this.client = new Discord.Client();
    this.soundPath = soundPath;
    this.maxQueueSize = maxQueueSize;
    this.sounds = {};
    this.guilds = {};

    const escapedPrefix = prefix.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    this.helpRegexp = new RegExp(`^${escapedPrefix}help`, 'i');
    this.soundRegexp = new RegExp(`^${escapedPrefix}(\\w+)(?:\\s+(\\w+))?`, 'i');

    this.createSoundList();

    this.client.on('ready', () => this.onReady());
    this.client.on('guildCreate', (guild) => this.onGuildCreate(guild));
    this.client.on('message', (message) => this.onMessage(message));
  }

  createSoundList() {
    const soundDirs = getSubDirectories(this.soundPath);
    soundDirs.forEach(dir => {
      this.sounds[dir] = {};
      const files = getFiles(path.join(this.soundPath, dir));
      files.forEach(file => {
        this.sounds[dir][file] = path.join(this.soundPath, dir, file);
      });
    });
  }

  start() {
    this.client.login(this.token);
  }

  onReady() {
    console.log('Bot ready!');
    this.client.user.setStatus('online', `${this.prefix}help for help`);
  }

  onGuildCreate(guild) {
    if(!guild.available) {
      return;
    }
    guild.defaultChannel.sendMessage('**HEKBOT READY. TYPE ' +
                                     `\`${this.prefix}HELP\` FOR HELP**`);
  }

  onMessage(message) {
    if(this.helpRegexp.test(message.content)) {
      return this.sendHelp(message.channel);
    }

    const match = message.content.match(this.soundRegexp);

    if(!match) {
      return;
    }

    if(message.deletable) {
      message.delete(1000);
    }

    if(!message.member.voiceChannel) {
      return message.reply('You need to be in a voice channel');
    }

    const collectionName = match[1];
    const soundName = match[2];

    if(!(collectionName in this.sounds)) {
      return;
    }

    const collection = this.sounds[collectionName];

    if(!soundName) {
      this.enqueueRandom(collection, message.member.voiceChannel);
    } else {
      if(soundName in collection) {
        this.enqueuePlay(collection[soundName], message.member.voiceChannel);
      } else {
        message.reply('Sound not found');
      }
    }
  }

  sendHelp(channel) {
    const commandList = Object.keys(this.sounds).map(collectionName => {
      const randomCommand = this.prefix + collectionName + '\n';
      const requestCommands = Object.keys(this.sounds[collectionName])
        .map(soundName => {
          return `  ${this.prefix}${collectionName} ${soundName}`;
        }).join('\n');

      return randomCommand + requestCommands;
    }).join('\n\n');

    channel.sendMessage('Available sounds:\n```\n' + commandList + '```');
  }

  enqueueRandom(collection, channel) {
    const keys = Object.keys(collection);
    const randomKey = keys[Math.floor(Math.random()*keys.length)];
    this.enqueuePlay(collection[randomKey], channel);
  }

  enqueuePlay(sound, channel) {
    const queue = this.guilds[channel.guild.id] || null;
    if(queue) {
      if(queue.length < this.maxQueueSize) {
        queue.push({sound, channel});
      }
    } else {
      this.guilds[channel.guild.id] = [{sound, channel}];
      this.playNext(channel.guild.id, null);
    }
  }

  playNext(guildID, connection) {
    const queue = this.guilds[guildID];
    if(!queue.length) {
      if(connection) {
        setTimeout(() => connection.disconnect(), 500);
      }
      delete this.guilds[guildID];
      return;
    }
    const next = queue.shift();

    if(connection && connection.channel.id === next.channel.id) {
      playSound(next.sound, connection)
        .then(() => this.playNext(guildID, connection));
    } else {
      next.channel.join()
        .then(newConn => playSound(next.sound, newConn))
        .then(newConn => this.playNext(guildID, newConn))
        .catch(console.err);
    }
  }

}

function getSubDirectories(dir) {
  return fs.readdirSync(dir).filter(file => {
    return fs.statSync(path.join(dir, file)).isDirectory();
  });
}

function getFiles(dir) {
  return fs.readdirSync(dir).filter(file => {
    return fs.statSync(path.join(dir, file)).isFile();
  });
}

function playSound(sound, connection) {
  return new Promise((resolve) => {
    setTimeout(() => {
      connection.playConvertedStream(fs.createReadStream(sound))
        .once('end', () => {
          resolve(connection);
        });
    }, 250);
  });
}

module.exports = HekBot;