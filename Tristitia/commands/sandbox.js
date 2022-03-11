const rm = require('../ba/ba-run-manager');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sandbox')
		.setDescription('A sandbox command that does various things.'),
	async execute(interaction) {
		const futureRuns = rm.bad();
		const run = futureRuns[0];
		await interaction.reply({ embeds: [run.embedOverview], components: run.buttonsOverview });
		await interaction.followUp({ embeds: [run.embedRoster], components: run.buttonsRoster });
	},
};