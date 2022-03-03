const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('run')
		.setDescription('Create a new run.'),
	async execute(interaction) {
		await interaction.reply('Created a new run.');
	},
};