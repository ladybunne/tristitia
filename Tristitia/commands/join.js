const _ = require('lodash');
const rm = require('../ba/ba-run-manager');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Join a run.')
		.addStringOption(option => option.setName('element').setDescription('Enter a party\'s element.')
			.addChoices(
				_.dropRight(Object.values(rm.elements)
					.map(element => [_.capitalize(element), element]))),
		)
		.addIntegerOption(option => option.setName('id').setDescription('Enter an existing run ID')),
	async execute(interaction) {
		await interaction.reply('Not implemented.');
	},
};