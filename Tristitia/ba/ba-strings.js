/* eslint-disable quotes */
const config = require('../config.json');

// TODO Clean this up and probably move the server-specific stuff to a config file.

const strings = {
	msgCreationText: 'Created run #%(id)s, led by %(raidLead)s, scheduled for <t:%(time)s:F>, <t:%(time)s:R>.',
	msgCancelText: 'Cancelled run #%(id)s, previously scheduled for <t:%(time)s:F>, <t:%(time)s:R>.',

	msgCalendarEventName: 'The Fire Place vs BA, Run #%(id)s',
	msgCalendarEventLocation: 'Eureka Hydatos (Materia)',
	msgCalendarEventDescription: "Venture alongside The Fire Place (https://discord.gg/thefireplace) " +
		"on a foray into The Baldesion Arsenal!\n" +
		"\n" +
		"Signups for this run are managed by Tristitia, The Fire Place's BA Discord bot.\n" +
		"\n" +
		"Click this link to be taken to the signup channel: " +
		"https://discord.com/channels/931496853873238046/943732635597963294 \n" +
		"\n" +
		"If that doesn't work, please ensure you've picked up the Eureka and Baldesion Arsenal roles from " +
		"#role-assign-content.\n",

	msgEmbedDescription: '**Raid Lead**: %(raidLead)s\n' +
		'**Time**: <t:%(time)s:F>, <t:%(time)s:R>',

	msgEmbedPartyTitle: `%(partyElement)s (%(partyCount)s)`,

	msgNotifyLeads: "Hello, %(partyLead)s! You are Run #%(runId)s's %(elementLead)s. " +
		"It's time to put up your party!\n" +
		"**The password for your party (%(element)s) is __%(password)s__**.\n\n" +

		"Please put up your party ASAP, with the above password, under Adventuring Forays -> Eureka Hydatos.\n" +
		"Copy this text and use it for the party description:\n" +
		"```The Fire Place vs BA, Run #%(runId)s - %(element)s Party```\n" +

		"Please ensure you have, in total, **1 tank**, **2 healers** and **5 any** slots listed, minus yourself.\n" +
		"Leave all other settings untouched.\n\n" +

		"Party members will receive passwords <t:%(time)s:R>, at <t:%(time)s:F>. " +
		"Please have your party up and configured by then!\n\n" +

		`If you have any questions about this process, please DM Athena (<@${config.botCreatorId}>)! Thank you!`,

	msgNotifyParties: "Hello, members of Run #%(runId)s's %(elementParty)s! It's time to join your party!\n" +
		"**The password for your party (%(element)s) is __%(password)s__**.\n\n" +

		"Please look under Private in the Party Finder for your party. It should be listed under Adventuring Forays -> " +
		"Eureka Hydatos, with **%(icon)s%(element)s** as the listed element and %(partyLead)s as the party lead.\n\n" +

		"Please try and join before <t:%(time)s:F>, <t:%(time)s:R> - reserves will receive all passwords at that time!\n\n" +

		"If you need help, feel free to ask here in this thread. your lead (%(partyLead)s) should see it. " +
		"If it's urgent, ping them!\n\n" +

		"If you have any questions about this process, please DM Athena! Thank you!",

	msgNotifyReserves: "Hello, reserves of Run #%(runId)s! It's your time to shine!\n" +
		"Below are the passwords to **ALL parties**. With these, you can fill any remaining spots! Go go!\n\n" +

		"%(passwordList)s\n\n" +

		"If any parties are still up, they'll be under Private in the Party Finder. They should be listed under " +
		"Adventuring Forays -> Eureka Hydatos, with the element in the description.\n\n" +

		"Act now! There's no guarantee that there _are_ open spots. If there aren't, I'm sorry!\n" +
		"Please still come into the instance either way - having people on hand is always helpful, and who knows? " +
		"You might end up on the run after all, if emergency fills are needed!\n\n" +

		"If you have any questions about this process, please DM Athena! Thank you!",

	msgAuditLogThreadName: "Run No. %(runId)s - Audit Log",
	msgPartiesThreadName: "Run No. %(runId)s - %(element)s Party",
	msgReservesThreadName: "Run No. %(runId)s - Reserves + Public",

	msgReservesThreadMessage: "Run #%(runId)s's passwords are now PUBLIC! See the below thread for details!",

	msgErrLeadPositionTaken: '**Unable to sign up as %(elementLead)s**. That position is already taken.',

	msgErrLeadDemote: '**Unable to join %(elementParty)s**. You are currently registered as %(elementLead)s.\n' +
		'Please unregister from the lead position, by clicking the button again, if you wish to join a party as a non-lead.',
	msgErrPartyFull: '**Unable to join %(elementParty)s**. This party is full.',
	msgErrJoinPartyLeadsLocked: '**Unable to join %(elementParty)s.** You are %(elementLead)s and leads are locked in.',
	msgErrJoinReservesPartiesLocked: '**Unable to join Reserves.** You are in %(elementParty)s and parties are locked in.',

	msgErrCombatRoleNoSignup: '**Unable to change combat role**. You are not currently signed up for Run #%(runId)s.\n' +
		'Please sign up for the run, then click a button to change your combat role.',

	msgErrCombatRoleSame: '**Unable to change combat role**. You are already a %(role)s!',
	msgErrCombatRoleLeadsLocked: '**Unable to change combat role**. You are %(elementLead)s and lead roles are locked in.',
	msgErrCombatRolePartiesLocked: '**Unable to change combat role**. You are in %(elementParty)s and party roles are locked in.',

	msgAuditLogThreadCreate: 'Hi, %(raidLead)s of Run #%(runId)s!\n\n' +

		'Here is an "audit log" thread that logs changes to the roster. ' +
		'It will be updated as users interact with the signup for your run.',

	msgAuditFooter: '<t:%(time)s:d> <t:%(time)s:T>, <t:%(time)s:R>',
	msgAuditJoinLead: '%(user)s signed up as %(newLead)s.',
	msgAuditMoveLead: '%(user)s changed lead element: %(oldLead)s → %(newLead)s',
	msgAuditPromoteLead: '%(user)s promoted to lead: %(oldParty)s → %(newLead)s',
	msgAuditLeaveLead: '%(user)s withdrew from %(oldLead)s.',
	msgAuditJoinParty: '%(user)s joined %(newParty)s.',
	msgAuditMoveParty: '%(user)s moved party: %(oldParty)s -> %(newParty)s',
	msgAuditLeaveParty: '%(user)s left %(oldParty)s.',
	msgAuditChangeRole: '%(user)s changed role: ' +
		'%(oldRoleIcon)s **%(oldRole)s** → %(newRoleIcon)s **%(newRole)s**',
};

exports.strings = strings;