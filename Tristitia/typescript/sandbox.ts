// @ts-check

interface RunMember {
	id: number;
	username: string;
	nickname: string;
	// combatrole is per run?
}

interface RunParty {
	name: string;
	lead: string; // leads are required if there's a party
	members?: RunMember[]; // allow for password drops (leads but no parties)
}

interface RunRoster {
	parties: RunParty[];
}

interface Run {
	runId: number;
	raidLead: RunMember;
	description: string;
	roster?: RunRoster; // optional allows for no roster
	password?: string | Map<string, string>;
}

function test(x: number) {
	let y = 0 + x;
	console.log(y);
}

test(5);