const rm = require('../ba/ba-run-manager');
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('run')
		.setDescription('Create a new run.')
		.addIntegerOption(option => option.setName('timestamp').setDescription('Enter a Unix timestamp.').setRequired(true)),
	async execute(interaction) {
		// Confirmation would be great here too.

		// force fetch the user to load accent colour
		await interaction.client.users.fetch(interaction.member.id, { force: true });
		const createRunOutcome = rm.newRun(rm.convertMemberToUser(interaction.member), interaction.options.getInteger('timestamp'));
		await interaction.reply(createRunOutcome);
	},
};