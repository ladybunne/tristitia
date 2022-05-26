const _ = require('lodash');
const rm = require('../ba/ba-run-manager');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('move')
		.setDescription('Move a party member from one party to another.')
		.addIntegerOption(option => option.setName('id').setDescription('Enter an existing run ID.').setRequired(true))
		.addUserOption(option => option.setName('target').setDescription('Enter the player to be moved.').setRequired(true))
		.addStringOption(option => option.setName('element').setDescription('Enter the new party\'s element.').setRequired(true)
			.addChoices(
				_.dropRight(Object.values(rm.elements)
					.map(element => [_.capitalize(element), element])))),
	async execute(interaction) {
		// finish writing this
		const moveRunOutcome = await rm.moveMember(
			interaction,
			interaction.member.user,
			interaction.options.getInteger('id'),
			interaction.options.getUser('target'),
			interaction.options.getString('element'));
		// TODO make this return some good words on a success
		// TODO This isn't grabbing nicknames.
		await interaction.reply(moveRunOutcome);
	},
};