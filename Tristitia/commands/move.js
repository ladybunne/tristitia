const rm = require('../ba/ba-run-manager');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('move')
		.setDescription('Move a player from one party to another.')
		.addIntegerOption(option => option.setName('id').setDescription('Enter an existing run ID.').setRequired(true)),
		// add more parameters here
	async execute(interaction) {
		// finish writing this
		const moveRunOutcome = await rm.moveMember(interaction, interaction.options.getInteger('id'));
		await interaction.reply(moveRunOutcome);
	},
};