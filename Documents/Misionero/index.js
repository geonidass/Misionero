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
const KICK_CHANNEL = "geonidass";
const LIVE_ROLE_ID = "1478159851480682496";

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

    // ===== Anti Flood =====
    if (!userMessages.has(userId)) {
        userMessages.set(userId, []);
    }

    const timestamps = userMessages.get(userId);
    timestamps.push(now);

    const filtered = timestamps.filter(t => now - t < 5000);
    userMessages.set(userId, filtered);

    if (filtered.length >= 5) {
        await message.delete().catch(() => {});
        return;
    }

    // ===== Anti Emoji Spam =====
    const emojiCount = (message.content.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
    if (emojiCount > 6) {
        await message.delete().catch(() => {});
        return;
    }

    // ===== Anti Mention Masiva =====
    if (message.mentions.users.size >= 4) {
        await message.delete().catch(() => {});
        return;
    }

    // ===== Anti Texto Repetido =====
    if (userLastMessage.get(userId) === message.content) {
        await message.delete().catch(() => {});
        return;
    }

    userLastMessage.set(userId, message.content);
});

// ===== SLASH COMMAND HANDLER =====

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "live") {

        const embed = new EmbedBuilder()
            .setTitle("🔴 ¡Estoy en directo en Kick!")
            .setDescription(`[Haz click aquí para entrar 🔥](https://kick.com/${KICK_CHANNEL})`)
            .setColor("Green")
            .setImage("https://media.tenor.com/8QfX1p0lF0YAAAAd/gaming-live.gif");

        await interaction.reply({
            content: `<@&${LIVE_ROLE_ID}>`,
            embeds: [embed]
        });
    }
});

client.once(Events.ClientReady, () => {
    console.log(`Bot listo como ${client.user.tag}`);
});

client.login(TOKEN);