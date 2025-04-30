const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const prefix = '>';
const timeRegex = /^(?:[0-9]|1[0-9]|2[0-3]):[0-5]?\d$/;
const TIME_OFFSET_MINUTES = 120; // 👉 số phút cộng thêm, chỉnh ở đây
let nextTime = '';
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', (msg) => {
  if (msg.author.bot) return; // Không xử lý tin nhắn từ bot khác

  console.log('🚀 ~ client.on ~ msg:', msg.content);

  if (msg.content.startsWith(prefix)) {
    const [command, param] = msg.content.slice(1).split(' ');

    switch (command) {
      case 'ping':
        msg.reply('pong');
        break;
      case 'kill': {
        if (!timeRegex.test(param)) {
          msg.reply(`${param} không đúng format thời gian. Nhập lại đi bro <3`);
          return;
        }

        const [hourStr, minuteStr] = param.split(':');
        let hour = parseInt(hourStr, 10);
        let minute = parseInt(minuteStr, 10);

        const now = new Date();
        const target = new Date();
        target.setHours(hour, minute, 0, 0);

        // Cộng thêm số phút offset
        target.setMinutes(target.getMinutes() + TIME_OFFSET_MINUTES);
        console.log(target);
        console.log(now);
        let diff = target.getTime() - now.getTime();
        console.log('🚀 ~ client.on ~ diff:', diff);

        if (diff < 0) {
          diff += 24 * 60 * 60 * 1000; // nếu target qua ngày
        }
        //Change nextTimeValue -> Format HH:mm

        // Format target time to HH:mm
        const formattedTime = target.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });

        // Set nextTime to the formatted time
        nextTime = formattedTime;

        msg.reply(
          `Okay, sẽ nhắc bro sau ${Math.floor(diff / 60000)} phút nữa nha! ⏰`
        );

        setTimeout(() => {
          const roleNames = fs
            .readFileSync('role.txt', 'utf-8')
            .split('\n') // tách theo dòng
            .map((line) => line.trim()) // bỏ khoảng trắng thừa
            .filter((line) => line.length > 0); // bỏ dòng trống

          // Sau đó tìm role
          const role = msg.guild.roles.cache.find((r) =>
            roleNames.includes(r.name)
          );

          if (role) {
            msg.channel.send(
              `<@&${role.id}> Đến giờ boss rồi, vào boss thôi! 🚀`
            );
          } else {
            msg.channel.send(
              `<@${msg.author.id}> Đến giờ boss rồi, vào boss thôi! 🚀`
            );
          }
        }, diff);

        break;
      }
      case 'spawn': {
        if (!nextTime) {
          msg.reply(
            'Chưa có thời gian spawn sắp tới, hãy sử dụng lệnh >kill để thiết lập thời gian spawn!'
          );
        } else {
          msg.reply(`Thời gian spawn sắp tới là: ${nextTime}`);
        }
        break;
      }
    }
  }
});

client.login(process.env.TOKEN);
