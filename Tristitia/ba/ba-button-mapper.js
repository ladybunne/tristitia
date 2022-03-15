const rm = require('./ba-run-manager');

const patternIsBASignup = /^ba-signup-.+/;
const patternIsBALead = /^ba-signup-#.+-lead-.+/;
const patternIsBAParty = /^ba-signup-#.+-party-.+/;

// Getting runId via button customId seems... maybe not okay.
// Revise this later, maybe.
const patternGetBARunId = /^ba-signup-#([0-9]+?)-.+/;
const patternGetBAElement = /^ba-signup-#.+-.+-(.+)/;

async function process(interaction) {
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
	await rm.signupLead(interaction.client, rm.convertMemberToUser(interaction.member), runId, element);
}

async function signupParty(interaction, runId, element) {
	await rm.signupParty(interaction.client, rm.convertMemberToUser(interaction.member), runId, element);
}

exports.process = process;