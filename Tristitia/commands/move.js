const _ = require('lodash');
const rm = require('../ba/ba-run-manager');
const { formatPartyNameSimple } = require('../ba/ba-run');
const { strings } = require('../ba/ba-strings');

const { SlashCommandBuilder } = require('@discordjs/builders');
const { sprintf } = require('sprintf-js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('move')
		.setDescription('Move a party member from one party to another.')
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
			interaction.options.getUser('target'),
			interaction.options.getString('element'));
		// TODO make this return some good words on a success
		// TODO This isn't grabbing nicknames.
		if (moveRunOutcome) {
			const args = {
				target: interaction.options.getUser('target'),
				elementParty: formatPartyNameSimple(interaction.options.getString('element')),
			};
			interaction.reply({ content: sprintf(strings.msgMoveText, args), ephemeral: true });
		}
	},
};