const _ = require('lodash');
const { sprintf } = require('sprintf-js');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('../config.json');

// not persistent yet, do that later
const futureRuns = [];
const pastRuns = [];
const cancelledRuns = [];

const elements = Object.freeze({
	earth: 'earth', wind: 'wind', water: 'water',
	fire: 'fire', lightning: 'lightning', ice: 'ice',
	support: 'support', reserve: 'reserve',
});

const msgCreationText = 'Created run #%(id)s, led by %(raidLead)s, scheduled for <t:%(time)s:F>, <t:%(time)s:R>.';
const msgCancelText = 'Cancelled run #%(id)s, previously scheduled for <t:%(time)s:F>, <t:%(time)s:R>.';

const msgLeadSwapToMember = '**Unable to join %(icon)s%(elementParty)s**. You are currently registered as **%(hex)s%(elementLead)s Lead**.\n' +
    'Please unregister from the lead position, by clicking the button again, if you wish to join a party as a non-lead.';

const msgEmbedDescription = '**Raid Lead**: %(raidLead)s\n' +
	'**Time**: <t:%(time)s:F>, <t:%(time)s:R>';

class BARun {
	constructor(raidLead, time) {
		this.runId = config.startIndex + futureRuns.length + pastRuns.length;
		this.raidLead = raidLead;
		this.time = time;
		this.overviewMessageId;
		this.rosterMessageId;
		this.reserveThreadCreateMessageId;
		this.leads = {
			earth: null, wind: null, water: null, fire: null, lightning: null, ice: null, support: null, reserve: null,
		};
		this.roster = {
			earth: [], wind: [], water: [], fire: [], lightning: [], ice: [], support: [], reserve: [],
		};
		this.passwords = {
			earth: this.generatePassword(), wind: this.generatePassword(), water: this.generatePassword(),
			fire: this.generatePassword(), lightning: this.generatePassword(), ice: this.generatePassword(),
			support: this.generatePassword(),
		};
		this.threads = {
			earth: null, wind: null, water: null, fire: null, lightning: null, ice: null, support: null, reserve: null,
		};
		this.lockLeads = false;
		this.lockParties = false;
		this.lockReserves = false;
		this.finished = false;
	}

	// generate a password from 0000 to 9999
	generatePassword() {
		let password = '';
		for (let i = 0; i < 4; i++) {
			password += Math.floor(Math.random() * 10);
		}
		return password;
	}

	checkExistingLead(user) {
		return Object.values(elements).find(element => this.leads[element] && this.leads[element].id == user.id);
	}

	checkExistingParty(user) {
		return Object.values(elements).find(element => this.roster[element].some(member => member.id == user.id));
	}

	formatUser(user, embellishments = false, mention = false) {
		let output = 'None';
		if (!user) return output;
		if (mention) return `<@${user.id}>`;
		try {
			if (user.nickname) output = user.nickname;
			else output = user.username;
		}
		catch (TypeException) {
			output = user.username;
		}

		const isLead = this.checkExistingLead(user);
		const isRaidLead = user.id == this.raidLead.id;

		if (embellishments) {
			// add role symbol here
			// default to dps now, make this configurable later
			output = `${config.dpsEmoji} ${output}`;

			if (isLead) output = `**${output}** `;
			if (isLead) output += config.hexes[isLead];
		}
		// add a space if not embellishments, or not lead
		if (isRaidLead) output += `${!isLead || !embellishments ? ' ' : ''}👑`;
		return output;
	}

	get creationText() {
		const args = { id: this.runId, raidLead: this.formatUser(this.raidLead, false, true), time: this.time };
		return sprintf(msgCreationText, args);
	}

	get cancelText() {
		const args = { id: this.runId, time: this.time };
		return sprintf(msgCancelText, args);
	}

	calculatePartyMemberCount(element) {
		let lead = 0;
		if (element != elements.reserve && this.leads[element]) lead = 1;
		return lead + this.roster[element].length;
	}

	get calculateLeads() {
		return Object.values(this.leads).filter(lead => lead).length;
	}

	get calculateTotalMembersCount() {
		return _.dropRight(Object.values(this.roster)).reduce((acc, x) => acc + x.length, 0) + this.calculateLeads;
	}

	formatPartyTitle(element) {
		if (element == elements.reserve) return `Reserves (${this.calculatePartyMemberCount(element)})`;
		const partyCount = `${this.calculatePartyMemberCount(element)}/${config.maxPartySize}`;
		return `${config.icons[element]} ${_.capitalize(element)} (${partyCount})`;
	}

	get embedOverview() {
		const embed = new MessageEmbed()
			.setTitle(`Run #${this.runId} - Overview (${this.calculateLeads}/${config.partyCount} leads)`)
			.setColor(this.raidLead.hexAccentColor)
			.setThumbnail(this.raidLead.displayAvatarURL());

		const descriptionArgs = { raidLead: this.formatUser(this.raidLead), time: this.time };
		let description = sprintf(msgEmbedDescription + '\n\n**Party Leads**:\n', descriptionArgs);

		// display party leads for all but reserves (no reserve lead!)
		_.dropRight(Object.values(elements)).forEach(element => {
			description += `${config.hexes[element]}${this.formatUser(this.leads[element])}\n`;
		});

		embed.setDescription(description);
		return embed;
	}

	get embedRoster() {
		const embed = new MessageEmbed()
			.setTitle(`Run #${this.runId} - Roster (${this.calculateTotalMembersCount}/${config.maxPartySize * config.partyCount} members + ` +
				`${this.roster[elements.reserve].length} reserves)`)
			.setColor(this.raidLead.hexAccentColor);

		const descriptionArgs = { raidLead: this.formatUser(this.raidLead), time: this.time };
		const description = sprintf(msgEmbedDescription + `\n${config.spEmoji}`, descriptionArgs);

		embed.setDescription(description);

		Object.values(elements).forEach(element => {
			let fieldValue = '';

			// lead
			if (this.leads[element]) fieldValue += `${this.formatUser(this.leads[element], true)}\n`;

			// party
			if (this.roster[element].length) {
				const formattedUsers = this.roster[element].map(user => this.formatUser(user, true));
				if (element == elements.reserve) fieldValue += formattedUsers.reduce((acc, x) => acc + `${x}, `, '').slice(0, -2);
				else fieldValue += formattedUsers.reduce((acc, x) => acc + `${x}\n`, '');
			}

			if (!fieldValue.length) fieldValue = 'None';
			embed.addField(this.formatPartyTitle(element), fieldValue, true);
		});

		return embed;
	}

	get buttonsOverview() {
		// early abort if leads are locked
		if (this.lockLeads) return [];

		// buttons
		const buttons = _.dropRight(Object.values(elements)).map(element => new MessageButton()
			.setCustomId(`ba-signup-#${this.runId}-lead-${element}`)
			.setEmoji(config.hexes[element])
			.setLabel(`${_.capitalize(element)} Lead`)
			.setStyle(element == elements.support ? 'PRIMARY' : 'SECONDARY'));

		// row 1 - earth wind water support
		const row1 = new MessageActionRow().addComponents(buttons.slice(0, 3).concat(buttons[6]));

		// row 2 - fire lightning ice
		const row2 = new MessageActionRow().addComponents(buttons.slice(3, 6));

		return [row1, row2];
	}

	get buttonsRoster() {
		// buttons
		const buttons = Object.values(elements).map(element => {
			let style = 'SECONDARY';
			if (element == elements.support) style = 'PRIMARY';
			else if (element == elements.reserve) style = 'SUCCESS';
			return new MessageButton()
				.setCustomId(`ba-signup-#${this.runId}-party-${element}`)
				.setEmoji(config.icons[element])
				.setLabel(element == elements.reserve ? 'Reserves' : `${_.capitalize(element)} Party`)
				.setStyle(style);
		});

		// row 1 - earth wind water support
		const row1 = new MessageActionRow();

		// row 2 - fire lightning ice reserves
		const row2 = new MessageActionRow();

		if (!this.lockParties) {
			row1.addComponents(buttons.slice(0, 3).concat(buttons[6]));
			row2.addComponents(buttons.slice(3, 6));
		}

		if (!this.lockReserves) row2.addComponents(buttons[7]);

		return [row1, row2].filter(row => row.components.length);
	}

	leadAdd(user, element) {
		if (this.lockLeads) return false;
		if (!this.leads[element]) this.leads[element] = user;
		return this.leads[element] != null;
	}

	leadRemove(user, element) {
		if (this.lockLeads) return false;
		if (this.leads[element].id == user.id) this.leads[element] = null;
		return this.leads[element] == null;
	}

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

	partyRemove(user, element) {
		if (element == elements.reserve) {
			if (this.lockReserves) return false;
		}
		else if (this.lockParties) return false;

		if (!this.roster[element].some(member => member.id == user.id)) return false;
		_.pull(this.roster[element], user);
		return !this.roster[element].some(member => member.id == user.id);
	}

	// This is a general note, but - it would be really good to track changes to a run's roster.
	// People often withdraw from runs on the day of the run, sometimes hours prior.
	// Coding in a "roster log" to track this would be good for a raid lead.

	async signupLead(user, element) {
		if (this.lockLeads) return false;

		const existingLead = this.checkExistingLead(user);
		const existingParty = this.checkExistingParty(user);
		let changed = false;

		if (element == existingLead) changed = this.leadRemove(user, element);
		else {
			changed = this.leadAdd(user, element);
			if (changed) {
				if (existingLead) this.leadRemove(user, existingLead);
				if (existingParty) this.partyRemove(user, existingParty);
			}
		}

		return changed;
	}

	// logic pending
	async signupParty(user, element) {
		if (element == elements.reserve) {
			if (this.lockReserves) return false;
		}
		else if (this.lockParties) return false;

		const existingLead = this.checkExistingLead(user);
		const existingParty = this.checkExistingParty(user);
		let changed = false;

		if (existingLead) {
			// DM user that they can't swap.
			const args = {
				icon: config.icons[element],
				elementParty: element == elements.reserve ? 'Reserves' : `${_.capitalize(element)} Party`,
				hex: config.hexes[existingLead],
				elementLead: _.capitalize(existingLead),
			};
			await user.send(sprintf(msgLeadSwapToMember, args));
			return false;
		}
		else if (element == existingParty) changed = this.partyRemove(user, element);
		else {
			changed = this.partyAdd(user, element);
			if (changed) {
				if (existingParty) this.partyRemove(user, existingParty);
			}
		}

		return changed;
	}
}

// convert GuildMember to User, with nickname
// note: this is super cursed
// TODO make this work with my own class
function convertMemberToUser(member) {
	const user = member.user;
	user.nickname = member.nickname;
	return user;
}

// create a new run, and add it to futureRuns
async function newRun(interaction, time) {
	await interaction.client.users.fetch(interaction.member.id, { force: true });
	const raidLead = convertMemberToUser(interaction.member);
	const run = new BARun(raidLead, time);
	futureRuns.push(run);

	// fetch signup channel, using config
	const signupChannel = await interaction.guild.channels.fetch(config.signupChannelId);

	// send embeds to the right channel!
	await signupChannel.send({ embeds: [run.embedOverview], components: run.buttonsOverview, fetchReply: true })
		.then(message => run.overviewMessageId = message.id);
	await signupChannel.send({ embeds: [run.embedRoster], components: run.buttonsRoster, fetchReply: true })
		.then(message => run.rosterMessageId = message.id);

	return run.creationText;
}

// search run arrays for a run by id
// I tried to condense this but it ended up breaking. Not sure why.
function lookupRunById(runId) {
	let state = 'future';
	let run = futureRuns.find(element => element.runId == runId);
	if (run) return { state, run };

	state = 'past';
	run = pastRuns.find(element => element.runId == runId);
	if (run) return { state, run };

	state = 'cancelled';
	run = cancelledRuns.find(element => element.runId == runId);
	if (run) return { state, run };

	return { state: 'no match', run: undefined };
}

// cancel a run, moving it from futureRuns to cancelledRuns
function cancelRun(runId, raidLead) {
	const lookup = lookupRunById(runId);
	if (lookup.state == 'future') {
		if (lookup.run.raidLead.id == raidLead.id) {
			// remove run from futureRuns
			_.pull(futureRuns, lookup.run);

			cancelledRuns.push(lookup.run);
			return lookup.run.cancelText;
		}
		else {
			return `You are not the raid lead of Run #${runId}! (You can't cancel other people's runs.)`;
		}
	}
	else {
		return `Could not cancel Run #${runId}. Reason: ${lookup.state}`;
	}
}

async function signupLead(user, runId, element) {
	const lookup = lookupRunById(runId);
	if (lookup.run) return await lookup.run.signupLead(user, element);
	else {
		console.log(`Couldn't sign up for run #${runId}. Reason: ${lookup.state}`);
		return;
	}
}

async function signupParty(user, runId, element) {
	const lookup = lookupRunById(runId);
	if (lookup.run) return await lookup.run.signupParty(user, element);
	else {
		console.log(`Couldn't sign up for run #${runId}. Reason: ${lookup.state}`);
		return;
	}
}

function bad() {
	return futureRuns;
}

exports.elements = elements;
exports.convertMemberToUser = convertMemberToUser;
exports.newRun = newRun;
exports.cancelRun = cancelRun;
exports.signupLead = signupLead;
exports.signupParty = signupParty;
exports.bad = bad;
