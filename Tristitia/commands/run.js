const rm = require('../ba/ba-run-manager');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('run')
		.setDescription('Create a new run.')
		.addIntegerOption(option => option.setName('timestamp').setDescription('Enter a Unix timestamp.').setRequired(true))
		.addStringOption(option => option.setName('type').setDescription('Enter the run\'s type. (default: Rostered)').setRequired(true)
			.addChoices(
				Object.values(rm.runTypes)
					.map(runType => [runType, runType])))
		.addStringOption(option => option.setName('description').setDescription('Describe the run.')),
	async execute(interaction) {
		// Confirmation would be great here too.
		await interaction.deferReply();
		const newRunOutcome = await rm.newRun(
			interaction,
			interaction.options.getInteger('timestamp'),
			interaction.options.getString('type'),
			interaction.options.getString('description'));
		await interaction.editReply(newRunOutcome);
	},
};