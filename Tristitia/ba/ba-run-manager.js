const _ = require('lodash');
const fs = require('fs');
const { BARun, elements, convertMemberToUser } = require('./ba-run');
const config = require('../config.json');

// now with new and improved persistence!
let futureRuns = [];
let pastRuns = [];
let cancelledRuns = [];

function handleError(err) {
	if (err) console.log(err);
}

async function saveRuns() {
	fs.writeFileSync(config.futureRunsFilename, JSON.stringify(futureRuns), handleError);
	fs.writeFileSync(config.pastRunsFilename, JSON.stringify(pastRuns), handleError);
	fs.writeFileSync(config.cancelledRunsFilename, JSON.stringify(cancelledRuns), handleError);
	console.log('Saved runs.');
}

async function loadRuns(client) {
	// lots of duplication here, but it's somewhat unavoidable

	// future
	try {
		const futureData = fs.readFileSync(config.futureRunsFilename);
		futureRuns = JSON.parse(futureData).map(run => Object.assign(BARun.prototype, run));
	}
	catch (err) {
		console.error(err);
	}

	// past
	try {
		const pastData = fs.readFileSync(config.pastRunsFilename);
		pastRuns = JSON.parse(pastData).map(run => Object.assign(BARun.prototype, run));
	}
	catch (err) {
		console.error(err);
	}

	// cancelled
	try {
		const cancelledData = fs.readFileSync(config.cancelledRunsFilename);
		cancelledRuns = JSON.parse(cancelledData).map(run => Object.assign(BARun.prototype, run));
	}
	catch (err) {
		console.error(err);
	}

	console.log(`future: ${futureRuns.map(run => run.runId)}\n` +
		`past: ${pastRuns.map(run => run.runId)}\n` +
		`cancelled: ${cancelledRuns.map(run => run.runId)}\n`);

	for (const run of futureRuns) await run.refreshLead(client);

	console.log('Loaded runs.');
}

// schedule notify events
function scheduleNotifyEvents(client, run) {
	const notifyLeads = () => run.notifyLeads(client);
	const notifyParties = () => run.notifyParties(client);
	const notifyReserves = () => run.notifyReserves(client);
	const finish = () => finishRun(client, run.runId);

	const now = Date.now();
	setTimeout(notifyLeads, run.timeNotifyLeads * 1000 - now);
	setTimeout(notifyParties, run.timeNotifyParties * 1000 - now);
	setTimeout(notifyReserves, run.timeNotifyReserves * 1000 - now);
	setTimeout(finish, run.timeFinish * 1000 - now);
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

	await run.sendEmbeds(interaction.client);

	scheduleNotifyEvents(interaction.client, run);

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
async function signupLead(client, user, runId, element) {
	const lookup = lookupRunById(runId);
	if (!lookup.run) {
		console.log(`Couldn't sign up as lead for Run #${runId}. Reason: ${lookup.state}`);
		return;
	}
	const outcome = await lookup.run.signupLead(client, user, element);
	await saveRuns();
	return outcome;
}

// external party signup request
async function signupParty(client, user, runId, element) {
	const lookup = lookupRunById(runId);
	if (!lookup.run) {
		console.log(`Couldn't sign up as party for Run #${runId}. Reason: ${lookup.state}`);
		return;
	}
	const outcome = await lookup.run.signupParty(client, user, element);
	await saveRuns();
	return outcome;
}

// this really shouldn't exist
function bad() {
	return futureRuns;
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
exports.bad = bad;
