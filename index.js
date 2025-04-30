const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
const supabase = require('./supabase');
require('dotenv').config();

const prefix = '>';
const timeRegex = /^(?:[0-9]|1[0-9]|2[0-3]):[0-5]?\d$/;
const TIME_OFFSET_MINUTES = 1;

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

// Handle >kill and >spawn commands
client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith(prefix)) return;
  const [command, param] = msg.content.slice(1).split(' ');

  if (command === 'kill') {
    if (!timeRegex.test(param)) {
      msg.reply(
        `${param} không đúng format thời gian. Nhập lại theo định dạng HH:mm đi bro <3`
      );
      return;
    }

    const [hourStr, minuteStr] = param.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    target.setMinutes(target.getMinutes() + TIME_OFFSET_MINUTES);

    if (target < now) {
      target.setDate(target.getDate() + 1);
    }

    const { error } = await supabase.from('schedules').insert([
      {
        guild_id: msg.guild.id,
        channel_id: msg.channel.id,
        user_id: msg.author.id,
        scheduled_at: target.toISOString(),
      },
    ]);

    if (error) {
      console.error(error);
      msg.reply('Có lỗi khi lưu lịch hẹn, thử lại sau nhé!');
      return;
    }

    msg.reply(
      `Okay, sẽ nhắc bro lúc ${target.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })} nha! ⏰`
    );
  }

  if (command === 'spawn') {
    const { data, error } = await supabase
      .from('schedules')
      .select('scheduled_at')
      .eq('guild_id', msg.guild.id)
      .order('scheduled_at', { ascending: true })
      .limit(1);

    if (data?.length > 0) {
      const time = new Date(data[0].scheduled_at).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
      msg.reply(`Thời gian spawn sắp tới là: ${time}`);
    } else {
      msg.reply('Chưa có lịch hẹn nào. Dùng >kill để tạo nhé!');
    }
  }
});

client.login(process.env.TOKEN);

cron.schedule('* * * * *', async () => {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .lte('scheduled_at', now);

  if (error || !data.length) return;

  for (const item of data) {
    const guild = client.guilds.cache.get(item.guild_id);
    if (!guild) continue;

    const channel = guild.channels.cache.get(item.channel_id);
    if (!channel?.isTextBased?.()) continue;

    const { data: roleRows } = await supabase.from('roles').select('role_name');

    const allowedRoles = (roleRows || []).map((r) => r.role_name);
    const role = guild.roles.cache.find((r) => allowedRoles.includes(r.name));

    if (role) {
      channel.send(`<@&${role.id}> Đến giờ boss rồi, vào boss thôi! 🚀`);
    } else {
      channel.send(`<@${item.user_id}> Đến giờ boss rồi, vào boss thôi! 🚀`);
    }

    await supabase.from('schedules').delete().eq('id', item.id);
  }
});
