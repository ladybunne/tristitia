const _ = require('lodash');
const baRunManager = require('../ba/ba-run-manager');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('signup')
		.setDescription('Sign up for a run.')
		.addStringOption(option => option.setName('element').setDescription('Enter a party\'s element.')
			.addChoices(
				_.dropRight(baRunManager.elements.array)
					.map(element => [_.capitalize(element), element])),
		)
		.addIntegerOption(option => option.setName('id').setDescription('Enter an existing run ID')),
	async execute(interaction) {
		await interaction.reply('Not implemented.');
	},
};