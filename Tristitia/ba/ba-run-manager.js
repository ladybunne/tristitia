/* eslint-disable quotes */
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

const msgEmbedDescription = '**Raid Lead**: %(raidLead)s\n' +
	'**Time**: <t:%(time)s:F>, <t:%(time)s:R>';

const msgLeadSwapToMember = '**Unable to join %(icon)s%(elementParty)s**. ' +
	'You are currently registered as **%(hex)s%(elementLead)s Lead**.\n' +
    'Please unregister from the lead position, by clicking the button again, if you wish to join a party as a non-lead.';


const msgNotifyLeads = "Hello, %(partyLead)s! You are Run #%(runId)s's **%(hex)s%(element)s Lead**. " +
	"It's time to put up your party!\n" +
	"**The password for your party (%(element)s) is __%(password)s__**.\n\n" +

	"Please put up your party ASAP, with the above password, under Adventuring Forays -> Eureka Hydatos.\n" +
	"Copy this text and use it for the party description:\n" +
	"```The Fire Place vs BA, Run #%(runId)s - %(element)s Party```\n" +

	"Please ensure you have, in total, **1 tank**, **2 healers** and **5 any** slots listed, minus yourself.\n" +
	"Leave all other settings untouched.\n\n" +

	"Party members will receive passwords <t:%(time)s:R>, at <t:%(time)s:F>. " +
	"Please have your party up and configured by then!\n\n" +

	`If you have any questions about this process, please DM Athena (<@${config.botCreatorId}>)! Thank you!`;

const msgNotifyParties = "Hello, members of Run #%(runId)s's **%(icon)s%(element)s Party**! It's time to join your party!\n" +
	"**The password for your party (%(element)s) is __%(password)s__**.\n\n" +

	"Please look under Private in the Party Finder for your party. It should be listed under Adventuring Forays -> " +
	"Eureka Hydatos, with **%(icon)s%(element)s** as the listed element and %(partyLead)s as the party lead.\n\n" +

	"Please try and join before <t:%(time)s:F>, <t:%(time)s:R> - reserves will receive all passwords at that time!\n" +
	"If you are able, please join as a **tank** or **healer** - BA can't happen without them!\n\n" +

	"If you need help, feel free to ask here in this thread. your lead (%(partyLead)s) should see it. " +
	"If it's urgent, ping them!\n\n" +

	"If you have any questions about this process, please DM Athena! Thank you!";

const msgNotifyReserves = "Hello, reserves of Run #%(runId)s! It's your time to shine!\n" +
	"Below are the passwords to **ALL parties**. With these, you can fill any remaining spots! Go go!\n\n" +

	"%(passwordList)s\n\n" +

	"If any parties are still up, they'll be under Private in the Party Finder. They should be listed under " +
	"Adventuring Forays -> Eureka Hydatos, with the element in the description.\n\n" +

	"Act now! There's no guarantee that there _are_ open spots. If there aren't, I'm sorry!\n" +
	"Please still come into the instance either way - having people on hand is always helpful, and who knows? " +
	"You might end up on the run after all, if emergency fills are needed!\n\n" +

	"If you have any questions about this process, please DM Athena! Thank you!";

const msgPartiesThreadName = "Run %(runId)s - %(element)s Party";
const msgReservesThreadName = "Run %(runId)s - Reserves and Public";

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

		const isLead = this.checkExistingLead(user);
		const isRaidLead = user.id == this.raidLead.id;

		if (mention) output = `<@${user.id}>`;
		else try {
			if (user.nickname) output = user.nickname;
			else output = user.username;
		}
		catch (TypeException) {
			output = user.username;
		}

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

	formatPartyRoster(element, mention = false) {
		let formattedRoster = '';

		// lead
		if (this.leads[element]) formattedRoster += `${this.formatUser(this.leads[element], true, mention)}\n`;

		// party
		if (this.roster[element].length) {
			const formattedUsers = this.roster[element].map(user => this.formatUser(user, true, mention));
			if (element == elements.reserve) formattedRoster += formattedUsers.reduce((acc, x) => acc + `${x}, `, '').slice(0, -2);
			else formattedRoster += formattedUsers.reduce((acc, x) => acc + `${x}\n`, '');
		}

		if (!formattedRoster.length) formattedRoster = 'None';

		return formattedRoster;
	}

	get creationText() {
		const args = { id: this.runId, raidLead: this.formatUser(this.raidLead, false, true), time: this.time };
		return sprintf(msgCreationText, args);
	}

	get cancelText() {
		const args = { id: this.runId, time: this.time };
		return sprintf(msgCancelText, args);
	}

	get notifyTimeLeads() {
		return this.time + config.leadsTimeDelta * 60;
	}

	get notifyTimeParties() {
		return this.time + config.partiesTimeDelta * 60;
	}

	get notifyTimeReserves() {
		return this.time + config.reservesTimeDelta * 60;
	}

	get embedOverview() {
		const embed = new MessageEmbed()
			.setTitle(`Run #${this.runId} - Overview (${this.calculateLeads}/${config.partyCount} leads)`)
			.setColor(this.raidLead.hexAccentColor)
			.setThumbnail(this.raidLead.displayAvatarURL());

		const descriptionArgs = { raidLead: this.formatUser(this.raidLead), time: this.time };
		let description = sprintf(msgEmbedDescription + '\n\n**Party Leads**:\n', descriptionArgs);

		// display party leads for all but reserves (no reserve lead!)
		for (const element of _.dropRight(Object.values(elements))) {
			description += `${config.hexes[element]} ${this.formatUser(this.leads[element])}\n`;
		}

		embed.setDescription(description);
		return embed;
	}

	get embedRoster() {
		const memberCount = `${this.calculateTotalMembersCount}/${config.maxPartySize * config.partyCount}`;
		const embed = new MessageEmbed()
			.setTitle(`Run #${this.runId} - Roster (${memberCount} members + ${this.roster[elements.reserve].length} reserves)`)
			.setColor(this.raidLead.hexAccentColor);

		const descriptionArgs = { raidLead: this.formatUser(this.raidLead), time: this.time };
		const description = sprintf(msgEmbedDescription + `\n${config.spEmoji}`, descriptionArgs);

		embed.setDescription(description);

		for (const element of Object.values(elements)) {
			embed.addField(this.formatPartyTitle(element), this.formatPartyRoster(element, false), true);
		}

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
		if (this.leads[element] == null) this.leads[element] = user;
		return this.leads[element] != null && this.leads[element].id == user.id;
	}

	leadRemove(user, element) {
		if (this.lockLeads) return false;
		if (this.leads[element].id == user.id) this.leads[element] = null;
		return this.leads[element] == null || this.leads[element].id != user.id;
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


	// TODO add feedback for when you try and take someone's position.
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

	// TODO add feedback when you try and join a full party.
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

	// probably add client as an argument
	async signupChannel(interaction) {
		return await interaction.guild.channels.fetch(config.signupChannelId);
	}

	async sendEmbeds(interaction) {
		// fetch signup channel, using config
		const signupChannel = await this.signupChannel(interaction);

		// send embeds to the right channel!
		await signupChannel.send({ embeds: [this.embedOverview], components: this.buttonsOverview, fetchReply: true })
			.then(message => this.overviewMessageId = message.id);
		await signupChannel.send({ embeds: [this.embedRoster], components: this.buttonsRoster, fetchReply: true })
			.then(message => this.rosterMessageId = message.id);
	}

	async notifyLeads() {
		if (this.lockLeads) return;

		for (const element of Object.values(elements)) {
			if (this.leads[element] == null) continue;

			const args = {
				partyLead: this.formatUser(this.leads[element], false, true),
				runId: this.runId,
				hex: config.hexes[element],
				element: _.capitalize(element),
				password: this.passwords[element],
				time: this.notifyTimeParties,
			};

			// TODO Use the private thread to do this instead of DMs, it's a bit more robust.
			await this.leads[element].send(sprintf(msgNotifyLeads, args))
				.catch(console.error);
		}

		this.lockLeads = true;
	}

	async notifyParties(interaction) {
		if (this.lockParties) return;

		// check for existing threads
		if (Object.values(this.threads).find(thread => thread != null)) {
			console.log(`Threads already exist for Run #${this.runId}.`);
			this.lockParties = true;
			return;
		}

		const signupChannel = await this.signupChannel(interaction);

		for (const element of Object.values(elements)) {
			// if empty, skip
			// TODO this is bad if no party lead
			// Currently it'll go ahead with a group of people that know a password...
			// ...that's not currently in use for a Party Finder group.
			if (this.leads[element] == null && !this.roster[element].length) continue;

			// create thread
			const thread = await signupChannel.threads.create({
				name: sprintf(msgPartiesThreadName, { runId: this.runId, element: _.capitalize(element) }),
				autoArchiveDuration: 60,
				type: 'GUILD_PRIVATE_THREAD',
			});

			// assemble list of people in the party
			const formattedRoster = this.formatPartyRoster(element, true) + '\n';

			const args = {
				runId: this.runId,
				icon: config.icons[element],
				element: _.capitalize(element),
				password: this.passwords[element],
				partyLead: this.formatUser(this.leads[element], false, true),
				time: this.notifyTimeReserves,
			};

			await thread.send(formattedRoster + sprintf(msgNotifyParties, args))
				.catch(console.error);
		}

		this.lockParties = true;
	}

	async notifyReserves(interaction) {
		if (this.lockReserves) return;

		const signupChannel = await this.signupChannel(interaction);

		const thread = await signupChannel.threads.create({
			name: sprintf(msgReservesThreadName, { runId: this.runId }),
			autoArchiveDuration: 60,
		});

		const formattedRoster = this.formatPartyRoster(elements.reserve, true) + '\n\n';

		const passwordList = _.dropRight(Object.values(elements)).reduce((acc, x) =>
			acc + `**${config.icons[x]}${_.capitalize(x)} Party**: **__${this.passwords[x]}__**\n`, '').slice(0, -1);

		const args = {
			runId: this.runId,
			passwordList: passwordList,
		};

		await thread.send(formattedRoster + sprintf(msgNotifyReserves, args))
			.catch(console.error);

		this.lockReserves = true;
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
// accentColor doesn't work if it's the default. Probably a discord.js issue.
async function newRun(interaction, time) {
	await interaction.client.users.fetch(interaction.member.id, { force: true });
	const raidLead = convertMemberToUser(interaction.member);
	const run = new BARun(raidLead, time);
	futureRuns.push(run);

	await run.sendEmbeds(interaction);

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
// TODO allow overrides (so that select people, like staff, can cancel other people's runs)
function cancelRun(interaction, runId) {
	const lookup = lookupRunById(runId);
	if (lookup.state == 'future') {
		if (lookup.run.raidLead.id == interaction.member.user.id) {
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
