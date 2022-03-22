const rm = require('./ba-run-manager');

const patternIsBASignup = /^ba-signup-.+/;
const patternIsBALead = /^ba-signup-#.+-lead-.+/;
const patternIsBAParty = /^ba-signup-#.+-party-.+/;
const patternIsBASetCombatRole = /^ba-setcombatrole-.+/;

// Getting runId via button customId seems... maybe not okay.
// Revise this later, maybe.
const patternGetBARunId = /^ba-.+-#([0-9]+?)-.+/;
const patternGetBAElement = /^ba-.+-#.+-.+-(.+)/;

// just the fourth argument for now, probably not great but it'll do
const patternGetBACombatRole = /^ba-.+-#.+-(.+)/;

async function process(interaction) {
	// update original message
	if (patternIsBASignup.test(interaction.customId)) {
		const runId = patternGetBARunId.exec(interaction.customId)[1];
		const element = patternGetBAElement.exec(interaction.customId)[1];
		// signup as lead
		if (patternIsBALead.test(interaction.customId)) {
			await signupLead(interaction, runId, element);
			return;
		}
		// signup as party member
		else if (patternIsBAParty.test(interaction.customId)) {
			await signupParty(interaction, runId, element);
			return;
		}
	}
	else if (patternIsBASetCombatRole.test(interaction.customId)) {
		const runId = patternGetBARunId.exec(interaction.customId)[1];
		const combatRole = patternGetBACombatRole.exec(interaction.customId)[1];
		await setCombatRole(interaction, runId, combatRole);
	}
}

async function signupLead(interaction, runId, element) {
	await rm.signupLead(interaction, interaction.member.user, runId, element, interaction.member.nickname);
}

async function signupParty(interaction, runId, element) {
	await rm.signupParty(interaction, interaction.member.user, runId, element, interaction.member.nickname);
}

async function setCombatRole(interaction, runId, combatRole) {
	await rm.setCombatRole(interaction, interaction.member.user, runId, combatRole);
}

exports.process = process;