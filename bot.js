'use strict';
const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');

class SoundBot {
  constructor(prefix, token, soundPath, maxQueueSize) {
    this.prefix = prefix;
    this.token = token;
    this.client = new Discord.Client({ disabledEvents: [
      'GUILD_CREATE', 'GUILD_DELETE', 'GUILD_UPDATE', 'GUILD_MEMBER_ADD', 'GUILD_MEMBER_REMOVE', 'GUILD_MEMBER_UPDATE',
      'GUILD_MEMBERS_CHUNK', 'GUILD_INTEGRATIONS_UPDATE', 'GUILD_ROLE_CREATE', 'GUILD_ROLE_DELETE', 'GUILD_ROLE_UPDATE', 'GUILD_BAN_ADD',
      'GUILD_BAN_REMOVE', 'GUILD_EMOJIS_UPDATE', 'CHANNEL_CREATE', 'CHANNEL_DELETE', 'CHANNEL_UPDATE', 'CHANNEL_PINS_UPDATE',
      'MESSAGE_DELETE', 'MESSAGE_UPDATE', 'MESSAGE_DELETE_BULK', 'MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE',
      'MESSAGE_REACTION_REMOVE_ALL', 'USER_UPDATE', 'USER_SETTINGS_UPDATE',
      'PRESENCE_UPDATE', 'TYPING_START', 'WEBHOOKS_UPDATE' ] });
    this.soundPath = soundPath;
    this.maxQueueSize = maxQueueSize;
    this.sounds = {};
    this.guilds = {};

    const escapedPrefix = prefix.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    this.helpRegexp = new RegExp(`^${escapedPrefix}help`, 'i');
    this.soundRegexp = new RegExp(`^${escapedPrefix}(\\w+)(?:\\s+(\\w+))?`, 'i');

    this.createSoundList();

    this.client.on('ready', () => this.onReady());
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
    console.info('Bot ready!');
    this.client.user.setPresence({
      activity: {
        name: `${this.prefix}help for help`,
      },
      status: 'online',
    }).catch(console.error);
  }

  async onMessage(message) {
    if(this.helpRegexp.test(message.content)) {
      return this.sendHelp(message.author, message);
    }

    const match = message.content.match(this.soundRegexp);

    if(!match) {
      return;
    }

    const collectionName = match[1];
    const soundName = match[2];

    if(!(collectionName in this.sounds)) {
      return;
    }

    if(message.deletable) {
      message.delete({ timeout: 1000, reason: 'auto' });
    }

    if(!message.member.voice.channel) {
      const msg = await message.reply('You need to be in a voice channel');
      msg.delete({ timeout: 5000, reason: 'auto' });
      return;
    }

    const collection = this.sounds[collectionName];

    if(!soundName) {
      this.enqueueRandom(collection, message.member.voice.channel);
    } else if (soundName in collection) {
      this.enqueuePlay(collection[soundName], message.member.voice.channel);
    } else {
      const msg = await message.reply('Sound not found');
      msg.delete({ timeout: 5000, reason: 'auto' });
      return;
    }
  }

  async sendHelp(user, message) {
    const commandList = Object.keys(this.sounds)
      .map(collectionName => ({
        name: `${this.prefix}${collectionName}\n`,
        value: Object.keys(this.sounds[collectionName])
          .map(soundName => {
            return `  ${this.prefix}${collectionName} ${soundName}`;
          }).join('\n'),
        inline: true,
      }));
    const embed = {
      color: 0x00FFFF,
      title: 'Available Sounds',
      fields: commandList,
    };
    await user.send('', { embed });
    message.delete({ timeout: 5000, reason: 'auto' });
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

  async playNext(guildID, connection) {
    const queue = this.guilds[guildID];
    if(!queue.length) {
      if(connection) {
        setTimeout(() => connection.disconnect(), 1000);
      }
      delete this.guilds[guildID];
      return;
    }
    const next = queue.shift();

    if(connection && connection.channel.id === next.channel.id) {
      await playSound(next.sound, connection);
      await this.playNext(guildID, connection);
    } else {
      const conn = await next.channel.join();
      await playSound(next.sound, conn);
      await this.playNext(guildID, conn);
    }
  }
}

function getSubDirectories(dir) {
  return fs.readdirSync(dir).filter(file => fs.statSync(path.join(dir, file)).isDirectory());
}

function getFiles(dir) {
  return fs.readdirSync(dir).filter(file => fs.statSync(path.join(dir, file)).isFile());
}

function playSound(sound, connection) {
  return new Promise((resolve) => {
    const dispatch = connection.play(fs.createReadStream(sound), { type: 'converted', volume: false });
    dispatch.once('end', resolve);
  });
}

module.exports = SoundBot;
