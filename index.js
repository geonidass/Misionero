// index.js
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Events, 
    SlashCommandBuilder, 
    REST, 
    Routes, 
    EmbedBuilder 
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ===== CONFIG =====
const KICK_CHANNEL = "geonidass"; // tu canal de Kick
const LIVE_ROLE_ID = "1478126063023423559"; // rol que se pingea
const STREAM_CHANNEL_ID = "1258102959363854460"; // canal ｜・𝐒𝐭𝐫𝐞𝐚𝐦𝐬

// ===== LIMITES CONFIGURABLES =====
const MAX_MESSAGES_IN_TIME = 5;
const TIME_WINDOW = 5000; // ms
const MAX_EMOJIS = 6;
const MAX_MENTIONS = 4;

// ===== CLIENT =====
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// ===== REGISTRAR SLASH COMMAND =====
const commands = [
    new SlashCommandBuilder()
        .setName('live')
        .setDescription('Anunciar directo en Kick')
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("Slash command registrado");
    } catch (error) {
        console.error(error);
    }
})();

// ===== SISTEMA DE ADVERTENCIAS Y TIMEOUT =====
const userWarnings = new Map(); 
const userMessages = new Map();
const userLastMessage = new Map();

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const userId = message.author.id;
    const now = Date.now();
    let isViolation = false;

    // --- CONTROL DE FLOOD ---
    if (!userMessages.has(userId)) userMessages.set(userId, []);
    const timestamps = userMessages.get(userId);
    timestamps.push(now);
    const recent = timestamps.filter(t => now - t < TIME_WINDOW);
    userMessages.set(userId, recent);
    if (recent.length > MAX_MESSAGES_IN_TIME) isViolation = true;

    // --- Anti Emoji Spam ---
    const emojiCount = (message.content.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
    if (emojiCount > MAX_EMOJIS) isViolation = true;

    // --- Anti Mention Masiva ---
    if (message.mentions.users.size > MAX_MENTIONS) isViolation = true;

    // --- Anti Texto Repetido ---
    if (userLastMessage.get(userId) === message.content) isViolation = true;
    userLastMessage.set(userId, message.content);

    // --- SI HUBO VIOLACION ---
    if (isViolation) {
        await message.delete().catch(() => {});
        let warnings = userWarnings.get(userId) || 0;
        warnings += 1;
        userWarnings.set(userId, warnings);

        try {
            const member = await message.guild.members.fetch(userId);

            if (warnings === 1) {
                const msg = await message.channel.send(`${member}, No hagas spam, papi`);
                setTimeout(() => msg.delete().catch(() => {}), 5000);
            } else if (warnings === 2) {
                const msg = await message.channel.send(`${member}, Última vez, no lo hagas`);
                setTimeout(() => msg.delete().catch(() => {}), 5000);
            } else if (warnings >= 3) {
                await member.timeout(60000, "Excedió límite de spam");
                const msg = await message.channel.send(`${member}, te pusimos un timeout por spam`);
                setTimeout(() => msg.delete().catch(() => {}), 5000);
                userWarnings.set(userId, 0); // reset
            }
        } catch (err) {
            console.error("Error aplicando advertencia o timeout:", err);
        }
    }
});

// ===== SLASH COMMAND HANDLER =====
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "live") {
        try {
            const channel = await client.channels.fetch(STREAM_CHANNEL_ID);

            const embed = new EmbedBuilder()
                .setTitle("🔴 ¡Estoy en directo en Kick!")
                .setDescription(`[Entra ahora mismo 🔥](https://kick.com/${KICK_CHANNEL})`)
                .setColor("Green")
                .setImage("https://media.tenor.com/8QfX1p0lF0YAAAAd/gaming-live.gif");

            await channel.send({
                content: `<@&${LIVE_ROLE_ID}>`,
                embeds: [embed]
            });

            await interaction.reply({ 
                content: "Notificación enviada en ｜・𝐒𝐭𝐫𝐞𝐚𝐦𝐬 ✅",
                ephemeral: true 
            });
        } catch (err) {
            console.error("Error al enviar notificación:", err);
            await interaction.reply({ 
                content: "Hubo un error al enviar la notificación ❌", 
                ephemeral: true 
            });
        }
    }
});

client.once(Events.ClientReady, () => {
    console.log(`Bot listo como ${client.user.tag}`);
});

// ===== ERROR HANDLER =====
client.on("error", console.error);
process.on("unhandledRejection", console.error);

client.login(TOKEN);