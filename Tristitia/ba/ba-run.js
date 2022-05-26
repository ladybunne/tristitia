const _ = require('lodash');
const { sprintf } = require('sprintf-js');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { handleError } = require('../common');
const { BAUser, combatRoles } = require('./ba-user');
const { strings } = require('./ba-strings');
const config = require('../config.json');

const elements = Object.freeze({
	earth: 'earth', wind: 'wind', water: 'water',
	fire: 'fire', lightning: 'lightning', ice: 'ice',
	support: 'support', reserve: 'reserve',
});

const auditColors = Object.freeze({
	green: '#44e544',
	yellow: '#e5e544',
	red: '#e54444',
	purple: '#e544e5',
	grey: '#b2b2b2',
});

class BARun {
	constructor(runId, raidLead, time) {
		this.runId = runId;
		this.raidLead = raidLead;
		this.time = time;
		this.overviewMessageId;
		this.rosterMessageId;
		this.reserveThreadMessageId;
		this.leads = {
			earth: null, wind: null, water: null, fire: null, lightning: null, ice: null, support: null, reserve: null,
		};
		this.roster = {
			earth: [], wind: [], water: [], fire: [], lightning: [], ice: [], support: [], reserve: [],
		};
		this.passwords = {
			earth: this.generatePassword, wind: this.generatePassword, water: this.generatePassword,
			fire: this.generatePassword, lightning: this.generatePassword, ice: this.generatePassword,
			support: this.generatePassword,
		};
		this.threads = {
			earth: null, wind: null, water: null, fire: null, lightning: null, ice: null, support: null, reserve: null,
		};
		this.auditLogThread = null;
		this.lockLeads = false;
		this.lockParties = false;
		this.lockReserves = false;
		this.finished = false;
	}

	// ---------------------------------------- Getters ----------------------------------------

	// generate a password from 0000 to 9999
	get generatePassword() {
		let password = '';
		for (let i = 0; i < 4; i++) {
			password += Math.floor(Math.random() * 10);
		}
		return password;
	}

	// calculate how many leads are signed up for the run
	get calculateLeads() {
		return Object.values(this.leads).filter(lead => lead).length;
	}

	// calculate number of members in a party, including leads
	calculatePartyMemberCount(element) {
		let lead = 0;
		if (element != elements.reserve && this.leads[element]) lead = 1;
		return lead + this.roster[element].length;
	}

	// calculate the total number of registered players for the run
	get calculateTotalMembersCount() {
		return _.dropRight(Object.values(this.roster))
			.reduce((acc, party) => acc + party.length, 0) + this.calculateLeads;
	}

	// create overview embed
	get embedOverview() {
		const embed = new MessageEmbed()
			.setTitle(`Run #${this.runId} - Overview (${this.calculateLeads}/${config.partyCount} leads)`)
			.setColor(this.raidLead.hexAccentColor)
			.setThumbnail(this.raidLead.displayAvatarURL());

		const descriptionArgs = { raidLead: this.formatUser(this.raidLead), time: this.time };
		const description = sprintf(strings.msgEmbedDescription + `\n${config.spEmoji}`, descriptionArgs);

		embed.setDescription(description);

		const leadsList = _.dropRight(Object.values(elements)).reduce((acc, element) =>
			acc + `${config.hexes[element]} ${this.formatUser(this.leads[element])}\n`, '');

		embed.addField('**Party Leads**', leadsList, true);

		return embed;
	}

	// create roster embed
	get embedRoster() {
		const memberCount = `${this.calculateTotalMembersCount}/${config.maxPartySize * config.partyCount}`;
		const embed = new MessageEmbed()
			.setTitle(`Run #${this.runId} - Roster (${memberCount} members + ` +
				`${this.roster[elements.reserve].length} reserves)`)
			.setColor(this.raidLead.hexAccentColor);

		const descriptionArgs = { raidLead: this.formatUser(this.raidLead), time: this.time };
		const description = sprintf(strings.msgEmbedDescription + `\n${config.spEmoji}`, descriptionArgs);

		embed.setDescription(description);

		for (const element of Object.values(elements)) {
			embed.addField(this.formatPartyTitleWithCount(element), this.formatPartyRoster(element, false), true);
		}

		return embed;
	}

	// create interaction buttons for overview embed
	get buttonsOverview() {
		// early abort if leads are locked
		if (this.lockLeads) return [];

		// buttons
		const buttons = _.dropRight(Object.values(elements)).map(element => new MessageButton()
			.setCustomId(`ba-signup-#${this.runId}-lead-${element}`)
			.setEmoji(config.hexes[element])
			.setLabel(this.formatPartyLeadSimple(element, false, false))
			.setStyle(element == elements.support ? 'PRIMARY' : 'SECONDARY'));

		// row 1 - earth wind water support
		const row1 = new MessageActionRow().addComponents(buttons.slice(0, 3).concat(buttons[6]));

		// row 2 - fire lightning ice
		const row2 = new MessageActionRow().addComponents(buttons.slice(3, 6));

		return [row1, row2];
	}

	// create interaction buttons for roster embed
	get buttonsRoster() {
		// buttons
		const signupButtons = Object.values(elements).map(element => {
			let style = 'SECONDARY';
			if (element == elements.support) style = 'PRIMARY';
			else if (element == elements.reserve) style = 'SUCCESS';
			return new MessageButton()
				.setCustomId(`ba-signup-#${this.runId}-party-${element}`)
				.setEmoji(config.icons[element])
				.setLabel(this.formatPartyNameSimple(element, false, false))
				.setStyle(style);
		});

		function createCombatRoleButton(combatRole, style, runId) {
			return new MessageButton()
				.setCustomId(`ba-setcombatrole-#${runId}-${combatRole}`)
				.setEmoji(config.combatRoles[combatRole])
				.setLabel(combatRole == combatRoles.dps ? 'DPS' : `${_.capitalize(combatRole)}`)
				.setStyle(style);
		}

		const tankButton = createCombatRoleButton(combatRoles.tank, 'PRIMARY', this.runId);
		const healerButton = createCombatRoleButton(combatRoles.healer, 'SUCCESS', this.runId);
		const dpsButton = createCombatRoleButton(combatRoles.dps, 'DANGER', this.runId);

		// row 1 - earth wind water support
		const row1 = new MessageActionRow();

		// row 2 - fire lightning ice reserves
		const row2 = new MessageActionRow();

		// row 3 - tank healer dps
		const row3 = new MessageActionRow();

		if (!this.lockParties) {
			row1.addComponents(signupButtons.slice(0, 3).concat(signupButtons[6]));
			row2.addComponents(signupButtons.slice(3, 6));
		}

		if (!this.lockReserves) row2.addComponents(signupButtons[7]);

		if (!this.lockParties || !this.lockReserves) row3.addComponents(tankButton, healerButton, dpsButton);

		return [row1, row2, row3].filter(row => row.components.length);
	}

	// calculate time when leads are notified
	get timeNotifyLeads() {
		return this.time + config.leadsTimeDelta * 60;
	}

	// calculate time when parties are notified
	get timeNotifyParties() {
		return this.time + config.partiesTimeDelta * 60;
	}

	// calculate time when reserves are notified
	get timeNotifyReserves() {
		return this.time + config.reservesTimeDelta * 60;
	}

	// calculate time when run finishes
	get timeFinish() {
		return this.time + config.finishTimeDelta * 60;
	}

	// response to run creation
	get creationText() {
		const args = { id: this.runId, raidLead: this.formatUser(this.raidLead, false, true), time: this.time };
		return sprintf(strings.msgCreationText, args);
	}

	// response to run cancellation
	get cancelText() {
		const args = { id: this.runId, time: this.time };
		return sprintf(strings.msgCancelText, args);
	}

	// ---------------------------------------- Formatting ----------------------------------------

	// format a user for string printing
	formatUser(user, embellishments = false, mention = false) {
		let output = 'None';

		if (!user) return output;

		const isLead = this.checkExisting(user).lead;
		const isRaidLead = user.id == this.raidLead.id;

		if (mention) output = `<@${user.id}>`;
		else output = user.nickname != undefined ? user.nickname : user.username;

		if (embellishments) {
			output = `${config.combatRoles[user.combatRole]} ${output}`;

			if (isLead) output = `**${output}** ${config.hexes[isLead]}`;
		}
		// add a space if not embellishments, or not lead
		if (isRaidLead) output += `${!isLead || !embellishments ? ' ' : ''}👑`;
		return output;
	}

	// formatted party lead and hex, optionally bold
	formatPartyLeadSimple(element, bold = true, hex = true) {
		if (element == undefined) return '';
		return `${hex ? config.hexes[element] : ''}` +
			`${bold ? '**' : ''}` +
			`${element == elements.reserve ? '' : `${_.capitalize(element)} Lead`}` +
			`${bold ? '**' : ''}`;
	}

	// formatted party name and icon, optionally bold
	formatPartyNameSimple(element, bold = true, icon = true) {
		if (element == undefined) return '';
		return `${icon ? config.icons[element] : ''}` +
			`${bold ? '**' : ''}` +
			`${element == elements.reserve ? 'Reserves' : `${_.capitalize(element)} Party`}` +
			`${bold ? '**' : ''}`;
	}

	// format the party name with member count
	formatPartyTitleWithCount(element) {
		const formattedElement = element == elements.reserve ? 'Reserves' : _.capitalize(element);
		const partyElement = `${config.icons[element]} ${formattedElement}`;

		let partyCount = '';
		if (element == elements.reserve) {
			partyCount = `${this.calculatePartyMemberCount(element)}`;
		}
		else if (this.roster[element].length >= config.maxPartySize - 1) {
			// if full
			partyCount = 'FULL';
		}
		else {
			partyCount = `${this.calculatePartyMemberCount(element)}/${config.maxPartySize}`;
		}

		return sprintf(strings.msgEmbedPartyTitle, { partyElement: partyElement, partyCount: partyCount });
	}

	// format party roster for use in embeds or threads
	formatPartyRoster(element, mention = false) {
		let formattedRoster = '';

		// lead
		if (this.leads[element]) formattedRoster += `${this.formatUser(this.leads[element], true, mention)}\n`;

		// party
		if (this.roster[element].length) {
			const formattedUsers = this.roster[element].map(user => this.formatUser(user, true, mention));
			if (element == elements.reserve) {
				formattedRoster += formattedUsers.reduce((acc, user) => acc + `${user}, `, '').slice(0, -2);
			}
			else formattedRoster += formattedUsers.reduce((acc, user) => acc + `${user}\n`, '');
		}

		if (!formattedRoster.length) formattedRoster = 'None';

		return formattedRoster;
	}

	// ---------------------------------------- On Create ----------------------------------------

	// create an audit log thread
	async createAuditLogThread(client) {
		// already exists, abort
		if (this.auditLogThread != null) return;

		const signupChannel = await this.fetchSignupChannel(client);

		const thread = await signupChannel.threads.create({
			name: sprintf(strings.msgAuditLogThreadName, { runId: this.runId }),
			autoArchiveDuration: 'MAX',
			invitable: false,
			type: 'GUILD_PRIVATE_THREAD',
		});

		this.auditLogThread = thread.id;

		const args = {
			raidLead: this.formatUser(this.raidLead, false, true),
			runId: this.runId,
		};
		await thread.send(sprintf(strings.msgAuditLogThreadCreate, args));
	}

	// send embeds to signup channel
	async sendEmbeds(client) {
		// fetch signup channel, using config
		const signupChannel = await this.fetchSignupChannel(client);

		// send embeds to the right channel!
		await signupChannel.send({ embeds: [this.embedOverview], components: this.buttonsOverview, fetchReply: true })
			.then(message => this.overviewMessageId = message.id);
		await signupChannel.send({ embeds: [this.embedRoster], components: this.buttonsRoster, fetchReply: true })
			.then(message => this.rosterMessageId = message.id);
	}

	// ---------------------------------------- Internal ----------------------------------------

	// get signup channel
	async fetchSignupChannel(client) {
		const guild = await client.guilds.fetch(config.guildId);
		return await guild.channels.fetch(config.signupChannelId);
	}

	// check if someone is already signed up, and return details if they are
	checkExisting(user) {
		let existingUser, lead, party;
		for (const element of Object.values(elements)) {
			// lead
			if (element != elements.reserve && this.leads[element]?.id == user.id) {
				existingUser = this.leads[element];
				lead = element;
				break;
			}

			// party
			const possibleMember = this.roster[element].find(member => member.id == user.id);
			if (possibleMember) {
				existingUser = possibleMember;
				party = element;
				break;
			}
		}

		return { user: existingUser, lead: lead, party: party };
	}

	// add a party lead
	leadAdd(user, element) {
		if (this.lockLeads) return false;
		if (this.leads[element] == null) this.leads[element] = user;
		return this.leads[element] != null && this.leads[element].id == user.id;
	}

	// remove a party lead
	leadRemove(user, element) {
		if (this.lockLeads) return false;
		if (this.leads[element].id == user.id) this.leads[element] = null;
		return this.leads[element] == null || this.leads[element].id != user.id;
	}

	// add a party member
	partyAdd(user, element) {
		if (element == elements.reserve) {
			if (this.lockReserves) return false;
		}
		else if (this.lockParties) return false;

		if (this.roster[element].some(member => member.id == user.id)) return false;
		if (this.roster[element].length >= config.maxPartySize - 1) return false;
		this.roster[element].push(user);
		return this.roster[element].some(member => member.id == user.id);
	}

	// remove a party member
	partyRemove(user, element) {
		if (element == elements.reserve) {
			if (this.lockReserves) return false;
		}
		else if (this.lockParties) return false;

		if (!this.roster[element].some(member => member.id == user.id)) return false;
		_.pull(this.roster[element], user);
		return !this.roster[element].some(member => member.id == user.id);
	}

	// TODO add logic to regenerate embeds
	async updateEmbeds(client, overview = false, roster = true) {
		const signupChannel = await this.fetchSignupChannel(client);

		// roster first
		if (roster) try {
			const rosterMessage = await signupChannel.messages.fetch(this.rosterMessageId);
			await rosterMessage.edit({ embeds: [this.embedRoster], components: this.buttonsRoster });
		}
		catch (err) {
			console.log(`#${this.runId}: ${this.rosterMessageId}`);
			handleError(err);
		}

		// overview
		if (overview) try {
			const overviewMessage = await signupChannel.messages.fetch(this.overviewMessageId);
			await overviewMessage.edit({ embeds: [this.embedOverview], components: this.buttonsOverview });
		}
		catch (err) {
			console.log(`#${this.runId}: ${this.overviewMessageId}`);
			handleError(err);
		}
	}

	// clean up a run - used during finish() and cancel()
	async cleanup(client, deleteThreads = false) {
		const signupChannel = await this.fetchSignupChannel(client);

		// archive all threads
		for (const threadId of Object.values(this.threads).concat(this.auditLogThread)) {
			// no thread!
			if (threadId == null) continue;

			const thread = await signupChannel.threads.fetch(threadId);

			// couldn't find thread
			if (thread == undefined) {
				console.log(`Cleaning up thread ${threadId} failed - could not find thread.`);
				continue;
			}

			if (deleteThreads) await thread.delete().catch(handleError);
			else {
				await thread.setArchived(false).catch(handleError);
				await thread.setLocked(true).catch(handleError);
				await thread.setArchived(true).catch(handleError);
			}
		}

		// delete all run messages (embeds and reserve thread message)
		for (const messageId of [this.overviewMessageId, this.rosterMessageId, this.reserveThreadMessageId]) {
			signupChannel.messages.fetch(messageId)
				.then(message => message.delete())
				.catch(handleError);
		}
	}

	// send something to the audit log
	async log(client, user, message, color = undefined) {
		const signupChannel = await this.fetchSignupChannel(client);
		const thread = await signupChannel.threads.fetch(this.auditLogThread);

		const now = Math.floor(Date.now() / 1000);
		const footer = sprintf(strings.msgAuditFooter, { time: now });
		const embed = new MessageEmbed()
			.setTitle(user.nickname != undefined ? user.nickname : user.username)
			.setDescription(`${message}\n\n${footer}`);
		if (color != undefined) embed.setColor(color);
		await thread.send({ embeds: [embed] });
	}

	// ---------------------------------------- Public ----------------------------------------

	// refresh a lead, typically after a load
	async refreshLead(client) {
		await client.users.fetch(this.raidLead.id, { force: true });
		const guild = await client.guilds.fetch(config.guildId);
		const guildMember = await guild.members.fetch(this.raidLead.id);
		this.raidLead = convertMemberToUser(guildMember);
	}

	// TODO All of these button interaction functions assume they're getting called from a button.
	// This is kind of a dumb assumption to make. It couples join/leave logic with UI updates, which is bad.


	// logic for lead signup request
	async signupLead(interaction, incomingUser, element, nickname = undefined) {
		if (this.lockLeads) return false;

		const existing = this.checkExisting(incomingUser);
		const baUser = existing?.user != undefined ? existing.user : new BAUser(incomingUser, nickname);
		let changed = false;
		let auditMessage, auditColor;

		if (element == existing.lead) {
			changed = this.leadRemove(baUser, element);
			auditMessage = strings.msgAuditLeaveLead;
			auditColor = auditColors.red;
		}
		else if (this.leads[element] != null) {
			// existing lead
			await interaction.reply({ content: sprintf(strings.msgErrLeadPositionTaken,
				{ elementLead: this.formatPartyLeadSimple(element, false) }), ephemeral: true });
			return false;
		}
		else {
			changed = this.leadAdd(baUser, element);
			if (changed) {
				if (existing.lead) {
					this.leadRemove(baUser, existing.lead);
					auditMessage = strings.msgAuditMoveLead;
					auditColor = auditColors.yellow;
				}
				else if (existing.party) {
					this.partyRemove(baUser, existing.party);
					auditMessage = strings.msgAuditPromoteLead;
					auditColor = auditColors.purple;
				}
				else {
					auditMessage = strings.msgAuditJoinLead;
					auditColor = auditColors.green;
				}
			}
		}

		if (changed) {
			// TODO This is bad handling of uncertain interaction types.
			// this happens if it's a button interaction
			try {
				await interaction.update({ embeds: [this.embedOverview], components: this.buttonsOverview });
				await this.updateEmbeds(interaction.client, false, true);
			}
			catch (error) {
				// otherwise it's from somewhere else
				if (error instanceof TypeError) {
					await this.updateEmbeds(interaction.client, true, true);
				}
				// otherwise something went wrong
				else handleError(error);
			}

			const args = {
				user: this.formatUser(baUser, false, false),
				oldLead: this.formatPartyLeadSimple(existing.lead),
				newLead: this.formatPartyLeadSimple(element),
				oldParty: this.formatPartyNameSimple(element),
			};
			await this.log(interaction.client, baUser, sprintf(auditMessage, args), auditColor);
		}
		return changed;
	}

	// logic for party signup request
	// TODO add feedback when you try and join a full party.
	async signupParty(interaction, incomingUser, element, nickname = undefined) {
		if (element == elements.reserve) {
			if (this.lockReserves) return false;
		}
		else if (this.lockParties) return false;

		const existing = this.checkExisting(incomingUser);

		if (existing.lead && this.lockLeads) {
			// ephemeral reply
			await interaction.reply({ content: sprintf(strings.msgErrJoinPartyLeadsLocked,
				{
					elementParty: this.formatPartyNameSimple(element, false),
					elementLead: this.formatPartyLeadSimple(existing.lead),
				}),
			ephemeral: true });
			return false;
		}
		if (existing.party != elements.reserve && this.lockParties) {
			// ephemeral reply
			await interaction.reply({ content: sprintf(strings.msgErrJoinReservesPartiesLocked,
				{ elementParty: this.formatPartyNameSimple(existing.party, false) }),
			ephemeral: true });
			return false;
		}

		const baUser = existing?.user != undefined ? existing.user : new BAUser(incomingUser, nickname);
		let changed = false;
		let auditMessage, auditColor;

		if (existing.lead) {
			// not allowed to step down from lead without explicitly doing so
			await interaction.reply({ content: sprintf(strings.msgErrLeadDemote,
				{
					elementParty: this.formatPartyNameSimple(element, false),
					elementLead: this.formatPartyLeadSimple(existing.lead),
				}),
			ephemeral: true });
			return false;
		}
		else if (element == existing.party) {
			changed = this.partyRemove(baUser, element);
			auditMessage = strings.msgAuditLeaveParty;
			auditColor = auditColors.red;
		}
		else if (this.roster[element].length >= config.maxPartySize - 1) {
			await interaction.reply({ content: sprintf(strings.msgErrPartyFull,
				{ elementParty: this.formatPartyNameSimple(element, false) }), ephemeral: true });
			return;
		}
		else {
			changed = this.partyAdd(baUser, element);
			if (changed) {
				if (existing.party) {
					this.partyRemove(baUser, existing.party);
					auditMessage = strings.msgAuditMoveParty;
					auditColor = auditColors.yellow;
				}
				else {
					auditMessage = strings.msgAuditJoinParty;
					auditColor = auditColors.green;
				}
			}
		}

		if (changed) {
			// TODO This is bad handling of uncertain interaction types.
			// this happens if it's a button interaction
			try {
				await interaction.update({ embeds: [this.embedRoster], components: this.buttonsRoster });
			}
			catch (error) {
				// otherwise it's from somewhere else
				if (error instanceof TypeError) {
					await this.updateEmbeds(interaction.client, false, true);
				}
				// otherwise something went wrong
				else handleError(error);
			}

			const args = {
				user: this.formatUser(baUser, false, false),
				oldParty: this.formatPartyNameSimple(existing.party),
				newParty: this.formatPartyNameSimple(element),
			};
			await this.log(interaction.client, baUser, sprintf(auditMessage, args), auditColor);
		}
		return changed;
	}

	// logic for set combat role request
	async setCombatRole(interaction, incomingUser, combatRole) {
		const existing = this.checkExisting(incomingUser);

		// if not signed up...
		if (!existing.lead && !existing.party) {
			await interaction.reply({ content: sprintf(strings.msgErrCombatRoleNoSignup,
				{ runId: this.runId }), ephemeral: true });
			return false;
		}
		if (existing.lead && this.lockLeads) {
			await interaction.reply({ content: sprintf(strings.msgErrCombatRoleLeadsLocked,
				{ elementLead: this.formatPartyLeadSimple(existing.lead) }), ephemeral: true });
			return false;
		}
		if (existing.party != elements.reserve && this.lockParties) {
			await interaction.reply({ content: sprintf(strings.msgErrCombatRolePartiesLocked,
				{ elementLead: this.formatPartyLeadSimple(existing.party) }), ephemeral: true });
			return false;
		}

		// respect locks
		if (existing.lead && this.lockLeads) return false;
		if (existing.party && existing.party != elements.reserve && this.lockParties) return false;
		if (existing.party == elements.reserve && this.lockReserves) return false;

		const baUser = existing.user;
		let changed = false;

		const oldCombatRole = baUser.combatRole;

		if (oldCombatRole == combatRole) {
			await interaction.reply({ content: sprintf(strings.msgErrCombatRoleSame,
				{ combatRole: `${config.combatRoles[combatRole]} **${combatRole}**` }), ephemeral: true });
			return false;
		}
		else {
			baUser.combatRole = combatRole;
			changed = true;
		}

		if (changed) {
			await interaction.update({ embeds: [this.embedRoster], components: this.buttonsRoster });
			const args = {
				user: this.formatUser(baUser),
				oldRoleIcon: config.combatRoles[oldCombatRole],
				oldRole: oldCombatRole,
				newRoleIcon: config.combatRoles[combatRole],
				newRole: combatRole,
			};
			await this.log(interaction.client, baUser, sprintf(strings.msgAuditChangeRole, args), auditColors.grey);
		}
		return changed;
	}

	// cancel a run
	async cancel(client) {
		let cancelled = false;
		if (this.lockLeads || this.lockParties || this.lockReserves) return false;

		await this.cleanup(client, true);

		cancelled = true;
		return cancelled;
	}

	// ---------------------------------------- Scheduled ----------------------------------------

	// notify leads - typically called automatically
	// TODO Use the private thread to do this instead of DMs, it's a bit more robust.
	async notifyLeads(client) {
		if (this.lockLeads) return;

		for (const element of Object.values(elements)) {
			if (this.leads[element] == null) continue;

			const args = {
				partyLead: this.formatUser(this.leads[element], false, true),
				runId: this.runId,
				elementLead: this.formatPartyLeadSimple(element),
				element: _.capitalize(element),
				password: this.passwords[element],
				time: this.timeNotifyParties,
			};

			try {
				const leadUser = await client.users.fetch(this.leads[element].id);
				await leadUser.send(sprintf(strings.msgNotifyLeads, args))
					.catch(console.error);
			}
			catch (err) { handleError(err); }
		}

		this.lockLeads = true;
		await this.updateEmbeds(client, true, false);
	}

	// notify parties - typically called automatically
	async notifyParties(client) {
		if (this.lockParties) return;

		// check for existing threads
		if (Object.values(this.threads).find(thread => thread != null)) {
			console.log(`Threads already exist for Run #${this.runId}.`);
			this.lockParties = true;
			return;
		}

		const signupChannel = await this.fetchSignupChannel(client);

		for (const element of Object.values(elements)) {
			if (element == elements.reserve) continue;

			// if empty, skip
			// TODO this is bad if no party lead
			// Currently it'll go ahead with a group of people that know a password...
			// ...that's not currently in use for a Party Finder group.
			if (this.leads[element] == null && !this.roster[element].length) continue;

			// create thread
			const thread = await signupChannel.threads.create({
				name: sprintf(strings.msgPartiesThreadName, { runId: this.runId, element: _.capitalize(element) }),
				autoArchiveDuration: 60,
				type: 'GUILD_PRIVATE_THREAD',
			});

			this.threads[element] = thread.id;

			// assemble list of people in the party
			const formattedRoster = this.formatPartyRoster(element, true) + '\n';

			const args = {
				runId: this.runId,
				elementParty: this.formatPartyNameSimple(element),
				icon: config.icons[element],
				element: _.capitalize(element),
				password: this.passwords[element],
				partyLead: this.formatUser(this.leads[element], false, true),
				time: this.timeNotifyReserves,
			};

			await thread.send(formattedRoster + sprintf(strings.msgNotifyParties, args))
				.catch(console.error);
		}

		this.lockParties = true;
		await this.updateEmbeds(client);
	}

	// notify reserves - typically called automatically
	async notifyReserves(client) {
		if (this.lockReserves) return;

		const signupChannel = await this.fetchSignupChannel(client);

		const reserveThreadMessage = await signupChannel.send(
			sprintf(strings.msgReservesThreadMessage, { runId: this.runId }));

		const thread = await reserveThreadMessage.startThread({
			name: sprintf(strings.msgReservesThreadName, { runId: this.runId }),
			autoArchiveDuration: 60,
		});

		this.threads[elements.reserve] = thread.id;
		this.reserveThreadMessageId = reserveThreadMessage.id;

		const formattedRoster = this.formatPartyRoster(elements.reserve, true) + '\n\n';

		const passwordList = _.dropRight(Object.values(elements)).reduce((acc, element) =>
			acc + `${this.formatPartyNameSimple(element)}: **__${this.passwords[element]}__**\n`, '').slice(0, -1);

		const args = {
			runId: this.runId,
			passwordList: passwordList,
		};

		await thread.send(formattedRoster + sprintf(strings.msgNotifyReserves, args))
			.catch(console.error);

		this.lockReserves = true;
		await this.updateEmbeds(client);
	}

	// finish a run
	async finish(client) {
		await this.cleanup(client);

		this.finished = true;
		return this.finished;
	}
}

// convert GuildMember to User, with nickname
// note: this is super cursed
// TODO make this work with my own class
function convertMemberToUser(member) {
	const user = member.user;
	user.nickname = member.nickname;
	user.combatRole = combatRoles.dps;
	return user;
}

exports.elements = elements;
exports.BARun = BARun;
exports.convertMemberToUser = convertMemberToUser;