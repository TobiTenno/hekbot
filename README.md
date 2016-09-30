# hekbot
Discord Vay Hek bot, inspired by the [Airhorn Bot](https://github.com/hammerandchisel/airhornbot).

## Usage
|Command | Description | Example |
|---|---|---|
|`<prefix>help` | Displays a help message and lists the available sounds. | `!help` |
|`<prefix><collection name>` | Plays a random sound from that collection. | `!hek` |
|`<prefix><collection name> <sound name>` | Plays a specific sound from that collection. | `!hek unacceptable` |

## Installation
- Download using `git clone https://github.com/nspacestd/hekbot.git`.
- `cd hekbot` and `npm install` to install the dependencies.
- If you're using PM2, add the bot token to `pm2.json` and start with `pm2 pm2.json`, otherwise use `TOKEN=<YOUR-TOKEN-HERE> node main.js`.

## Configuration
|Environment Variable | Description | Default |
|---|---|---|
|`TOKEN` | Discord API token | none |
|`PREFIX` | Bot command prefix | `!` |
|`SOUND_FOLDER` | Audio files foler | `audio` |
|`MAX_QUEUE_SIZE` | Maximum size of each server's sound queue | 10 |

## Sound files
Audio files have to be encoded in 16-bit signed stereo PCM at 48KHz.
With FFMPEG: `ffmpeg -i <input file> -f s16le -ar 48000 -ac 2 <output file>`

Each subfolder of the audio file folder will be treated as a *sound collection*, each file inside a subfolder will be treated as a separate sound.
