const combatRoles = Object.freeze({
	tank: 'tank',
	healer: 'healer',
	dps: 'dps',
});

class BAUser {
	constructor(user, nickname = undefined) {
		this.id = user.id;
		this.username = user.username;
		this.nickname = nickname;
		this.combatRole = combatRoles.dps;
	}
}

exports.BAUser = BAUser;
exports.combatRoles = combatRoles;