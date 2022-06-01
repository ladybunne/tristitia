const _ = require('lodash');
const rm = require('../ba/ba-run-manager');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Join a run.')
		.addIntegerOption(option => option.setName('id').setDescription('Enter an existing run ID'))
		.addStringOption(option => option.setName('element').setDescription('Enter a party\'s element.')
			.addChoices(
				_.dropRight(Object.values(rm.elements)
					.map(element => [_.capitalize(element), element])))),
	async execute(interaction) {
		await interaction.reply('Not implemented.');
	},
};