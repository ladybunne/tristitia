require('./sandbox');

const fs = require('node:fs');
const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');
const bm = require('./ba/ba-button-mapper');

const patternIsBACommand = /ba/;

// new client
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
exports.client = client;

// slash command setup
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

// on ready
client.once('ready', () => {
	console.log('Ready!');
});

// handle slash command interactions
client.on('interactionCreate', async interaction => {
	// buttons
	if (interaction.isButton()) {
		if (patternIsBACommand.test(interaction.customId)) await bm.processButtonInteraction(interaction);
		return;
	}

	// slash commands
	if (interaction.isCommand()) {
		const command = client.commands.get(interaction.commandName);
		if (!command) return;
		try {
			await command.execute(interaction);
		}
		catch (error) {
			console.error(error);
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
		return;
	}
});

// finally, log in
client.login(token);