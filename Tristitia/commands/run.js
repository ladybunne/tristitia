const rm = require('../ba/ba-run-manager');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('run')
		.setDescription('Create a new run.')
		.addIntegerOption(option => option.setName('timestamp').setDescription('Enter a Unix timestamp.').setRequired(true)),
	async execute(interaction) {
		// Confirmation would be great here too.
		await interaction.deferReply();
		const newRunOutcome = await rm.newRun(interaction, interaction.options.getInteger('timestamp'));
		await interaction.editReply(newRunOutcome);
	},
};