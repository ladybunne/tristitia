const rm = require('../ba/ba-run-manager');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('Leave a run.')
		.addIntegerOption(option => option.setName('timestamp').setDescription('Enter a Unix timestamp.').setRequired(true)),
	async execute(interaction) {
		await interaction.reply('Not implemented.');
	},
};