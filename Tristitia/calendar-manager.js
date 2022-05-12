const { google } = require('googleapis');
const key = require('./credentials.json');
const config = require('./config.json');

// create new JWT client
const jwtClient = new google.auth.JWT(
	key.client_email,
	null,
	key.private_key,
	['https://www.googleapis.com/auth/calendar'],
	null,
);
const calendar = google.calendar({ version: 'v3', auth: jwtClient });

function addEvent(name, location, description, startTime, endTime) {
	const event = {
		'summary': name,
		'location': location,
		'description': description,
		'start': {
			'dateTime': startTime,
		},
		'end': {
			'dateTime': endTime,
		},
	};
	calendar.events.insert({
		auth: jwtClient,
		calendarId: config.calendarId,
		resource: event,
	}, function(err, result) {
		if (err) {
			console.log('There was an error contacting the Calendar service: ' + err);
			return;
		}
		console.log('Event created: %s', result.data.htmlLink);
	});
}

exports.addEvent = addEvent;

// credit to: https://stackoverflow.com/questions/60645895/cant-authenticate-google-service-account-using-node-js
// for the structure of this