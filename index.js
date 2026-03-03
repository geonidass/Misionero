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

// ===== SISTEMA AUTOMOD =====
const userMessages = new Map();
const userLastMessage = new Map();

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const userId = message.author.id;
    const now = Date.now();

    // --- Anti Flood ---
    if (!userMessages.has(userId)) userMessages.set(userId, []);
    const timestamps = userMessages.get(userId);
    timestamps.push(now);
    const filtered = timestamps.filter(t => now - t < 5000);
    userMessages.set(userId, filtered);
    if (filtered.length >= 5) return await message.delete().catch(() => {});

    // --- Anti Emoji Spam ---
    const emojiCount = (message.content.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
    if (emojiCount > 6) return await message.delete().catch(() => {});

    // --- Anti Mention Masiva ---
    if (message.mentions.users.size >= 4) return await message.delete().catch(() => {});

    // --- Anti Texto Repetido ---
    if (userLastMessage.get(userId) === message.content) return await message.delete().catch(() => {});
    userLastMessage.set(userId, message.content);
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