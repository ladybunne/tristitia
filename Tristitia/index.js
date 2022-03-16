require('./sandbox');

const fs = require('node:fs');
const { Client, Collection, Intents } = require('discord.js');
const { token } = require('./config.json');
const rm = require('./ba/ba-run-manager');
const bm = require('./ba/ba-button-mapper');

const patternIsBACommand = /ba/;

// new client
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// slash command setup
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

// on ready
client.once('ready', async () => {
	try {
		console.log(`Logged in as ${client.user.username}#${client.user.discriminator}.`);

		// make sure runs are loaded
		await rm.loadRuns(client);

		// update embeds
		await rm.updateEmbeds(client);

		console.log('Finished startup.');
	}
	catch (error) {
		console.error(error);
	}
});

// handle slash command interactions
client.on('interactionCreate', async interaction => {
	try {
		// buttons
		if (interaction.isButton()) {
			if (patternIsBACommand.test(interaction.customId)) await bm.process(interaction);
		}

		// slash commands
		else if (interaction.isCommand()) {
			const command = client.commands.get(interaction.commandName);
			if (!command) return;
			await command.execute(interaction);
		}
	}
	catch (error) {
		console.error(error);
		try {
			await interaction.reply({ content: 'There was an error while handling this interaction!', ephemeral: true });
		}
		catch (replyError) {
			console.error(replyError);
		}
	}
	return;
});

// finally, log in
client.login(token);