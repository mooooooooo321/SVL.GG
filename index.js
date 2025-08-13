const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  ChannelType,
  Events
} = require('discord.js');

const express = require('express');
const app = express();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const prefix = '!';
const CATEGORY_ID = '1332872828994719858';
const MOD_ROLE_ID = '1341059401972453406';

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),

  new SlashCommandBuilder().setName('help').setDescription('Show all commands'),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement')
    .addStringOption(opt => opt.setName('message').setDescription('Raw text to send').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete messages')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Number to delete').setRequired(true)),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member')
    .addUserOption(opt => opt.setName('user').setDescription('Target').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason')),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member')
    .addUserOption(opt => opt.setName('user').setDescription('Target').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason')),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member')
    .addUserOption(opt => opt.setName('user').setDescription('Target').setRequired(true))
    .addStringOption(opt => opt.setName('duration').setDescription('e.g. 10m, 1h').setRequired(true)),

  new SlashCommandBuilder()
    .setName('dmrole')
    .setDescription('DM all users in a role')
    .addRoleOption(opt => opt.setName('role').setDescription('Role to DM').setRequired(true))
    .addStringOption(opt => opt.setName('message').setDescription('Message to send').setRequired(true)),

  new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway')
    .addStringOption(opt => opt.setName('prize').setDescription('Prize').setRequired(true))
    .addStringOption(opt => opt.setName('duration').setDescription('e.g. 1m, 1h').setRequired(true))
    .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setRequired(true))
    .addAttachmentOption(opt => opt.setName('image').setDescription('Attach image (optional)')),

  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Create ticket panel (admin only)')
];

client.once('ready', async () => {
  await client.application.commands.set(commands);
  console.log(`✅ Logged in as ${client.user.tag}`);

  const activities = [
    { name: 'Made by 𝕱𝖔𝖉𝖊𝖓 | /help', type: 2 },
  ];

  let i = 0;
  setInterval(() => {
    client.user.setActivity(activities[i]);
    i = (i + 1) % activities.length;
  }, 15000);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const { commandName, options, guild, member } = interaction;

    if (commandName === 'ping') {
      return interaction.reply(`🏓 Pong! ${client.ws.ping}ms`);
    }

    if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('🛠 Commands')
        .addFields(
          { name: '/ping', value: 'Bot ping' },
          { name: '/announce', value: 'Send announcement' },
          { name: '/giveaway', value: 'Start giveaway' },
          { name: '/kick /ban /timeout', value: 'Moderation tools' },
          { name: '/dmrole', value: 'DM a role' },
          { name: '/clear', value: 'Delete messages' }
        )
        .setColor('Blue');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'announce') {
      if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages))
        return interaction.reply({ content: '❌ Missing permissions.', ephemeral: true });
      const msg = options.getString('message');
      await interaction.channel.send(msg);
      return interaction.reply({ content: '📢 Announced.', ephemeral: true });
    }

    if (commandName === 'clear') {
      if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages))
        return interaction.reply({ content: '❌ Missing permissions.', ephemeral: true });
      const amount = options.getInteger('amount');
      await interaction.channel.bulkDelete(amount, true).catch(() => {});
      return interaction.reply({ content: `🧹 Deleted ${amount} messages.`, ephemeral: true });
    }

    if (commandName === 'kick') {
      if (!member.permissions.has(PermissionsBitField.Flags.KickMembers))
        return interaction.reply({ content: '❌ Missing permissions.', ephemeral: true });
      const user = options.getUser('user');
      const reason = options.getString('reason') || 'No reason';
      const target = guild.members.cache.get(user.id);
      if (!target || !target.kickable) return interaction.reply('❌ Cannot kick this user.');
      await target.kick(reason);
      return interaction.reply(`👢 ${user.username} got kicked!`);
    }

    if (commandName === 'ban') {
      if (!member.permissions.has(PermissionsBitField.Flags.BanMembers))
        return interaction.reply({ content: '❌ Missing permissions.', ephemeral: true });
      const user = options.getUser('user');
      const reason = options.getString('reason') || 'No reason';
      const target = guild.members.cache.get(user.id);
      if (!target || !target.bannable) return interaction.reply('❌ Cannot ban this user.');
      await target.ban({ reason });
      return interaction.reply(`🔨 ${user.username} has been banned.`);
    }

    if (commandName === 'timeout') {
      if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
        return interaction.reply({ content: '❌ Missing permissions.', ephemeral: true });
      const user = options.getUser('user');
      const time = parseDuration(options.getString('duration'));
      if (!time) return interaction.reply({ content: '❌ Invalid time format.', ephemeral: true });
      const target = guild.members.cache.get(user.id);
      if (!target || !target.moderatable) return interaction.reply('❌ Cannot timeout user.');
      await target.timeout(time);
      return interaction.reply(`🛏️ ${user.username} is timed out.`);
    }

    if (commandName === 'dmrole') {
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
        return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
      const role = options.getRole('role');
      const text = options.getString('message');
      let count = 0;
      for (const m of role.members.values()) {
        try {
          await m.send(text);
          count++;
        } catch {}
      }
      return interaction.reply({ content: `📬 DMed ${count} users.`, ephemeral: true });
    }

    if (commandName === 'giveaway') {
      if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages))
        return interaction.reply({ content: '❌ Missing permissions.', ephemeral: true });
      const prize = options.getString('prize');
      const duration = parseDuration(options.getString('duration'));
      const winners = options.getInteger('winners');
      const image = options.getAttachment('image');
      if (!duration) return interaction.reply({ content: '❌ Invalid duration.', ephemeral: true });

      const end = Date.now() + duration;
      const embed = new EmbedBuilder()
        .setTitle(`🎉 ${prize}`)
        .setDescription(`🎁 Winners: ${winners}\n🕒 Ends: <t:${Math.floor(end / 1000)}:R>\n📅 <t:${Math.floor(end / 1000)}:F>`)
        .setFooter({ text: `Hosted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setColor('Green');

      if (image) embed.setImage(image.url);

      const button = new ButtonBuilder().setCustomId('enter_giveaway').setLabel('Enter 🎉').setStyle(ButtonStyle.Primary);
      const row = new ActionRowBuilder().addComponents(button);

      const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
      const entries = new Set();

      const collector = msg.createMessageComponentCollector({ time: duration });
      collector.on('collect', i => {
        if (entries.has(i.user.id)) return i.reply({ content: '❌ Already entered.', ephemeral: true });
        entries.add(i.user.id);
        i.reply({ content: '🎉 You entered!', ephemeral: true });
      });

      collector.on('end', () => {
        const users = [...entries];
        if (!users.length) return interaction.followUp('😢 No entries.');
        const winnersList = users.sort(() => 0.5 - Math.random()).slice(0, winners);
        interaction.followUp(`🏆 Congrats ${winnersList.map(id => `<@${id}>`).join(', ')}! You won **${prize}**!`);
      });
    }

    if (commandName === 'panel') {
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator))
        return interaction.reply({ content: '❌ Admin only.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle('🎟 Create a Ticket')
        .setDescription('Click the button below to open a support ticket.')
        .setColor('Purple');

      const button = new ButtonBuilder().setCustomId('create_ticket').setLabel('Open Ticket').setStyle(ButtonStyle.Success);
      const row = new ActionRowBuilder().addComponents(button);

      return interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  if (interaction.isButton()) {
    const { guild, member, customId, user } = interaction;

    if (customId === 'create_ticket') {
      const channel = await guild.channels.create({
        name: `${user.username}-${Date.now()}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
          },
          {
            id: MOD_ROLE_ID,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
          }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle('🎫 Ticket Opened')
        .setDescription('Please wait for a moderator. You can explain your issue below.')
        .setColor('Aqua');

      const claim = new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Primary);
      const close = new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder().addComponents(claim, close);

      await channel.send({
        content: `<@${user.id}> <@&${MOD_ROLE_ID}>`,
        embeds: [embed],
        components: [row]
      });

      interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
    }

    if (customId === 'claim_ticket') {
      if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
        return interaction.reply({ content: '❌ Only mods can claim.', ephemeral: true });

      const close = new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder().addComponents(close);

      await interaction.message.edit({ components: [row] });
      await interaction.channel.send(`🛠️ Ticket is now being handled by <@${interaction.user.id}>`);
      return interaction.reply({ content: '✅ Claimed.', ephemeral: true });
    }

    if (customId === 'close_ticket') {
      if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
        return interaction.reply({ content: '❌ Only mods can close.', ephemeral: true });
      await interaction.reply({ content: '⏳ Closing ticket in 3s...', ephemeral: true });
      setTimeout(() => {
        interaction.channel.delete().catch(() => {});
      }, 3000);
    }
  }
});

// Legacy text command (!announce)
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  if (cmd === 'announce') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply('❌ You need Manage Messages permission to use this.');
    }

    const announcement = args.join(' ');
    if (!announcement) {
      return message.reply('❌ Please provide a message to announce.');
    }

    try {
      await message.channel.send(announcement);
      return message.reply('📢 Announcement sent!');
    } catch (error) {
      console.error('Failed to send announcement:', error);
      return message.reply('❌ Failed to send announcement.');
    }
  }
});

// Uptime web server
app.get('/', (req, res) => res.send('✅ Bot is online'));
app.listen(3000, () => console.log('🌐 Web server running on port 3000'));

// Login
client.login(process.env.TOKEN);

// Utils
function parseDuration(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const [_, num, unit] = match;
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return parseInt(num) * map[unit];
}
