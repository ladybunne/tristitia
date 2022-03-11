const rm = require('../ba/ba-run-manager');
const { client } = require('../index');

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('run')
		.setDescription('Create a new run.')
		.addIntegerOption(option => option.setName('timestamp').setDescription('Enter a Unix timestamp.').setRequired(true)),
	async execute(interaction) {
		// Confirmation would be great here too.
		await client.users.fetch(interaction.member.id, { force: true });
		const raidLead = await interaction.guild.members.fetch(interaction.member.id, { force: true });
		console.log(raidLead);
		const createRunOutcome = rm.newRun(raidLead, interaction.options.getInteger('timestamp'));
		await interaction.reply(createRunOutcome);
	},
};