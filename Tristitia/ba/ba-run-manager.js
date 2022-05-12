const _ = require('lodash');
const { sprintf } = require('sprintf-js');
const fs = require('fs/promises');
const schedule = require('node-schedule');
const { BARun, elements, convertMemberToUser } = require('./ba-run');
const cm = require('../calendar-manager');
const { handleError } = require('../common');
const { strings } = require('./ba-strings');
const config = require('../config.json');
const { DataResolver } = require('discord.js');

// now with new and improved persistence!
let futureRuns = [];
let pastRuns = [];
let cancelledRuns = [];

async function saveRuns() {
	await fs.writeFile(config.futureRunsFilename, JSON.stringify(futureRuns), handleError);
	await fs.writeFile(config.pastRunsFilename, JSON.stringify(pastRuns), handleError);
	await fs.writeFile(config.cancelledRunsFilename, JSON.stringify(cancelledRuns), handleError);
	// console.log('Saved runs.');
}

async function loadRuns(client) {
	// lots of duplication here, but it's somewhat unavoidable

	await fs.readFile(config.futureRunsFilename)
		.then((data) => futureRuns = JSON.parse(data).map(run => Object.assign(new BARun, run)))
		.catch(handleError);

	await fs.readFile(config.pastRunsFilename)
		.then((data) => pastRuns = JSON.parse(data).map(run => Object.assign(new BARun, run)))
		.catch(handleError);

	await fs.readFile(config.cancelledRunsFilename)
		.then((data) => cancelledRuns = JSON.parse(data).map(run => Object.assign(new BARun, run)))
		.catch(handleError);

	// console.log(`future: ${futureRuns.map(run => run.runId)}\n` +
	// 	`past: ${pastRuns.map(run => run.runId)}\n` +
	// 	`cancelled: ${cancelledRuns.map(run => run.runId)}`);

	for (const run of futureRuns) await run.refreshLead(client);

	// console.log('Loaded runs.');
}

// schedule notify events
function scheduleNotifyEvents(client, run) {
	// error handling so the bot doesn't explode
	const notifyLeads = async () => {
		try { await run.notifyLeads(client); }
		catch (err) { handleError(err); }
	};
	const notifyParties = async () => {
		try { await run.notifyParties(client); }
		catch (err) { handleError(err); }
	};
	const notifyReserves = async () => {
		try { await run.notifyReserves(client); }
		catch (err) { handleError(err); }
	};
	const finish = async () => {
		try { await finishRun(client, run.runId); }
		catch (err) { handleError(err); }
	};

	const timeNotifyLeads = new Date(run.timeNotifyLeads * 1000);
	const timeNotifyParties = new Date(run.timeNotifyParties * 1000);
	const timeNotifyReserves = new Date(run.timeNotifyReserves * 1000);
	const timeFinish = new Date(run.timeFinish * 1000);

	schedule.scheduleJob(timeNotifyLeads, notifyLeads);
	schedule.scheduleJob(timeNotifyParties, notifyParties);
	schedule.scheduleJob(timeNotifyReserves, notifyReserves);
	schedule.scheduleJob(timeFinish, finish);

	// const now = Date.now();
	// setTimeout(notifyLeads, run.timeNotifyLeads * 1000 - now);
	// setTimeout(notifyParties, run.timeNotifyParties * 1000 - now);
	// setTimeout(notifyReserves, run.timeNotifyReserves * 1000 - now);
	// setTimeout(finish, run.timeFinish * 1000 - now);
}

// create a new run, and add it to futureRuns
// accentColor doesn't work if it's the default. Probably an API issue.
async function newRun(interaction, time) {
	const now = Date.now();
	if (time * 1000 < now) {
		return 'Unable to create run: start time is in the past.';
	}
	if ((time + config.leadsTimeDelta * 60) * 1000 < now) {
		return 'Unable to create run: start time is too soon, not enough time for notify events.';
	}

	const runId = config.startIndex + futureRuns.length + pastRuns.length + cancelledRuns.length;

	await interaction.client.users.fetch(interaction.member.id, { force: true });
	const raidLead = convertMemberToUser(interaction.member);

	const run = new BARun(runId, raidLead, time);
	futureRuns.push(run);

	await run.createAuditLogThread(interaction.client);
	await run.sendEmbeds(interaction.client);

	scheduleNotifyEvents(interaction.client, run);

	// add event to Google Calendar
	const startTime = new Date(time * 1000).toISOString();
	const endTime = new Date((time + config.finishTimeDelta * 60) * 1000).toISOString();

	// TODO finish formatting the text tomorrow.
	cm.addEvent(sprintf(strings.msgCalendarEventName),
		strings.msgCalendarEventLocation,
		strings.msgCalendarEventDescription,
		startTime, endTime);

	await saveRuns();

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
async function cancelRun(interaction, runId) {
	const lookup = lookupRunById(runId);

	if (lookup.state != 'future') return `Could not cancel Run #${runId}. Reason: ${lookup.state}`;
	if (lookup.run.raidLead.id != interaction.member.user.id) {
		return `You are not the raid lead of Run #${runId}! (You can't cancel other people's runs.)`;
	}

	const cancelled = await lookup.run.cancel(interaction.client);

	if (!cancelled) {
		console.log(`Internal run cancellation of Run #${runId} failed.`);
		return;
	}

	// remove run from futureRuns
	_.pull(futureRuns, lookup.run);
	cancelledRuns.push(lookup.run);

	await saveRuns();

	return lookup.run.cancelText;
}

async function finishRun(client, runId) {
	const lookup = lookupRunById(runId);
	if (!lookup.run) {
		console.log(`Couldn't sign up as lead for Run #${runId}. Reason: ${lookup.state}`);
		return;
	}

	const finished = await lookup.run.finish(client);

	if (!finished) {
		console.log(`Internal run finishing of Run #${runId} failed.`);
		return;
	}

	// remove run from futureRuns
	_.pull(futureRuns, lookup.run);
	pastRuns.push(lookup.run);

	await saveRuns();
}

// external request to update embeds
async function updateEmbeds(client) {
	for (const run of futureRuns) {
		await run.updateEmbeds(client);
	}
}

// external lead signup request
async function signupLead(interaction, user, runId, element, nickname = undefined) {
	const lookup = lookupRunById(runId);
	if (!lookup.run) {
		console.log(`Couldn't sign up as lead for Run #${runId}. Reason: ${lookup.state}`);
		return;
	}
	const outcome = await lookup.run.signupLead(interaction, user, element, nickname);
	if (outcome) await saveRuns();
	return outcome;
}

// external party signup request
async function signupParty(interaction, user, runId, element, nickname = undefined) {
	const lookup = lookupRunById(runId);
	if (!lookup.run) {
		console.log(`Couldn't sign up as party for Run #${runId}. Reason: ${lookup.state}`);
		return;
	}
	const outcome = await lookup.run.signupParty(interaction, user, element, nickname);
	if (outcome) await saveRuns();
	return outcome;
}

// external combat role change request
async function setCombatRole(interaction, user, runId, combatRole) {
	const lookup = lookupRunById(runId);
	if (!lookup.run) {
		console.log(`Couldn't change combat role for Run #${runId}. Reason: ${lookup.state}`);
		return;
	}
	const outcome = await lookup.run.setCombatRole(interaction, user, combatRole);
	if (outcome) await saveRuns();
	return outcome;
}

exports.elements = elements;
exports.convertMemberToUser = convertMemberToUser;
exports.saveRuns = saveRuns;
exports.loadRuns = loadRuns;
exports.newRun = newRun;
exports.cancelRun = cancelRun;
exports.updateEmbeds = updateEmbeds;
exports.signupLead = signupLead;
exports.signupParty = signupParty;
exports.setCombatRole = setCombatRole;
