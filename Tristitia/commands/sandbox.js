const rm = require('../ba/ba-run-manager');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sandbox')
		.setDescription('A sandbox command that does various things.'),
	async execute(interaction) {
		await interaction.reply('Hooray, a sandbox!');
	},
};