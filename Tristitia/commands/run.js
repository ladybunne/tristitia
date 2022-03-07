const baRunManager = require('../ba/ba-run-manager');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('run')
		.setDescription('Create a new run.')
		.addIntegerOption(option => option.setName('timestamp').setDescription('Enter a Unix timestamp').setRequired(true)),
	async execute(interaction) {
		const createRunOutcome = baRunManager.newRun(interaction.member, interaction.options.getInteger('timestamp'));
		await interaction.reply(createRunOutcome);
	},
};