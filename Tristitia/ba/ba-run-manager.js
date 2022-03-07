const _ = require('lodash');
const { sprintf } = require('sprintf-js');
const { MessageEmbed } = require('discord.js');
const { startIndex, icons, hexes, spEmoji } = require('../config.json');

// not persistent yet, do that later
const futureRuns = [];
const pastRuns = [];
const cancelledRuns = [];

const elements = {
	earth: 'earth',
	wind: 'wind',
	water: 'water',
	fire: 'fire',
	lightning: 'lightning',
	ice: 'ice',
	support: 'support',
	reserve: 'reserve',
};

const msgCreationText = 'Created run #%(id)s, led by %(raidLead)s, scheduled for <t:%(time)s:F>, <t:%(time)s:R>.';
const msgCancelText = 'Cancelled run #%(id)s, previously scheduled for <t:%(time)s:F>, <t:%(time)s:R>.';

const msgEmbedDescription = '**Raid Lead**: %(raidLead)s\n' +
	'**Time**: <t:%(time)s:F>, <t:%(time)s:R>';

class BARun {
	constructor(raidLead, time) {
		this.runId = startIndex + futureRuns.length + pastRuns.length;
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
		this.lockMembers = false;
		this.lockReserves = false;
		this.finished = false;
	}

	formatUser(user, mention = false) {
		if (!user) return 'None';
		if (mention) return `<@${user.id}>`;
		try {
			if (user.nickname) return user.nickname;
			else return user.username;
		}
		catch (TypeException) {
			return user.username;
		}
	}

	get creationText() {
		const args = { id: this.runId, raidLead: this.formatUser(this.raidLead, true), time: this.time };
		return sprintf(msgCreationText, args);
	}

	get cancelText() {
		const args = { id: this.runId, time: this.time };
		return sprintf(msgCancelText, args);
	}

	get embedOverview() {
		const embed = new MessageEmbed()
			.setTitle(`Run #${this.runId} - Overview`)
			.setTimestamp()
			.setFooter({ text: 'Some footer text here', iconURL: 'https://i.imgur.com/AfFp7pu.png' });

		const descriptionArgs = { raidLead: this.formatUser(this.raidLead), time: this.time };
		let description = sprintf(msgEmbedDescription + '**Party Leads**:\n', descriptionArgs);

		// display party leads for all but reserves (no reserve lead!)
		_.dropRight(elements.array).forEach(element => {
			description += `${hexes[element]}${this.formatUser(this.leads[element])} `;
		});

		embed.setDescription(description);
		return embed;
	}

	get embedRoster() {
		const embed = new MessageEmbed()
			.setTitle(`Run #${this.runId} - Roster`);

		const descriptionArgs = { raidLead: this.formatUser(this.raidLead), time: this.time };
		const description = sprintf(msgEmbedDescription + `\n${spEmoji}`, descriptionArgs);

		embed.setDescription(description);

		// party lists not implemented yet, sorry!
		elements.array.forEach(element => {
			embed.addField(`${icons[element]}${_.capitalize(element)} (0/8)`, '-', true);
		});

		return embed;
	}

	// generate a password from 0000 to 9999
	generatePassword() {
		let password = '';
		for (let i = 0; i < 4; i++) {
			password += Math.floor(Math.random() * 10);
		}
		return password;
	}

	// logic pending
	registerPartyLead(user, element) {
		this.leads[element] = user;
	}

	// logic pending
	registerPartyMember(user, element) {
		this.roster[element].push(user);
	}
}

// create a new run, and add it to futureRuns
function newRun(raidLead, time) {
	const run = new BARun(raidLead, time);
	futureRuns.push(run);
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

exports.elements = elements;
exports.newRun = newRun;
exports.cancelRun = cancelRun;
