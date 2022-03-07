const { startIndex } = require('../config.json');

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
			earth: null, wind: null, water: null, fire: null, lightning: null, ice: null, support: null, reserve: null,
		};
		this.threads = {
			earth: null, wind: null, water: null, fire: null, lightning: null, ice: null, support: null, reserve: null,
		};
		this.lockLeads = false;
		this.lockMembers = false;
		this.lockReserves = false;
		this.finished = false;
	}

	get creationText() {
		return `Created run with ID #${this.runId}, led by <@${this.raidLead}>, scheduled for <t:${this.time}:F> (<t:${this.time}:R>).`;
	}

	get cancelText() {
		return `Cancelled run #${this.runId}, previously scheduled for scheduled for <t:${this.time}:F> (<t:${this.time}:R>).`;
	}

	generatePasswords() {
		function generatePassword() {
			let password = '';
			for (let i = 0; i < 4; i++) {
				password += Math.floor(Math.random() * 10);
			}
			return password;
		}
		elements.array.forEach(element => {
			this.passwords[element] = generatePassword();
		});
	}
}

function newRun(raidLead, time) {
	const run = new BARun(raidLead, time);
	futureRuns.push(run);
	return run.creationText;
}

function lookupRunById(runId) {
	let state = 'future';
	let run = futureRuns.find(element => element.runId == runId);
	if (run !== undefined) return { state, run };

	state = 'past';
	run = pastRuns.find(element => element.runId == runId);
	if (run !== undefined) return { state, run };

	state = 'cancelled';
	run = cancelledRuns.find(element => element.runId == runId);
	if (run !== undefined) return { state, run };

	return { state: 'no match', run: undefined };
}

function cancelRun(runId, raidLead) {
	const lookup = lookupRunById(runId);
	if (lookup.state == 'future') {
		if (lookup.run.raidLead == raidLead) {
			// remove run from futureRuns
			const index = futureRuns.indexOf(lookup.run);
			if (index > -1) futureRuns.splice(index, 1);

			cancelledRuns.push(lookup.run);
			return lookup.run.cancelText;
		}
		else {
			return `You are not the raid lead of Run #${runId}, and therefore cannot cancel the run.`;
		}
	}
	else {
		return `Could not cancel Run #${runId}. Reason: ${lookup.state}`;
	}
}

exports.newRun = newRun;
exports.cancelRun = cancelRun;
