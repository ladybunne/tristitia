const baRunManager = require('../ba/ba-run-manager');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cancel')
		.setDescription('Cancel an existing run.')
		.addIntegerOption(option => option.setName('id').setDescription('Enter an existing run ID').setRequired(true)),
	async execute(interaction) {
		// Eventually, confirmation would be great here.
		const cancelRunOutcome = baRunManager.cancelRun(interaction.options.getInteger('id'), interaction.member);
		await interaction.reply(cancelRunOutcome);
	},
};