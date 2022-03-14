const rm = require('./ba-run-manager');

const patternIsBASignup = /signup/;
const patternIsBALead = /lead/;
const patternIsBAParty = /party/;

// Getting runId via button customId seems... maybe not okay.
// Revise this later, maybe.
const patternGetBARunId = /ba-signup-#(.+?)-/;
const patternGetBAElement = /ba-signup-#.*-.*-(.*)/;

async function processButtonInteraction(interaction) {
	// update original message
	if (patternIsBASignup.test(interaction.customId)) {
		const runId = patternGetBARunId.exec(interaction.customId)[1];
		const element = patternGetBAElement.exec(interaction.customId)[1];
		// signup as lead
		if (patternIsBALead.test(interaction.customId)) {
			await interaction.deferUpdate();
			await signupLead(interaction, runId, element);
			return;
		}
		// signup as party member
		else if (patternIsBAParty.test(interaction.customId)) {
			await interaction.deferUpdate();
			await signupParty(interaction, runId, element);
			return;
		}
	}
}

async function signupLead(interaction, runId, element) {
	await rm.signupLead(rm.convertMemberToUser(interaction.member), runId, element);

	// update embeds
	const run = rm.bad()[0];

	// this is super duper cursed
	const overviewMessage = await interaction.channel.messages.fetch(run.overviewMessageId);
	await overviewMessage.edit({ embeds: [run.embedOverview], components: run.buttonsOverview });
	const rosterMessage = await interaction.channel.messages.fetch(run.rosterMessageId);
	await rosterMessage.edit({ embeds: [run.embedRoster], components: run.buttonsRoster });
}

async function signupParty(interaction, runId, element) {
	await rm.signupParty(rm.convertMemberToUser(interaction.member), runId, element);

	// update embeds
	const run = rm.bad()[0];

	// this is super duper cursed
	const overviewMessage = await interaction.channel.messages.fetch(run.overviewMessageId);
	await overviewMessage.edit({ embeds: [run.embedOverview], components: run.buttonsOverview });
	const rosterMessage = await interaction.channel.messages.fetch(run.rosterMessageId);
	await rosterMessage.edit({ embeds: [run.embedRoster], components: run.buttonsRoster });
}

exports.processButtonInteraction = processButtonInteraction;