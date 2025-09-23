const fs = require('fs');
const { ServicetradeSDK, ServicetradeLegacySDK } = require('./index.js');

// CUSTOMIZE THESE TO MEET YOUR NEEDS
const BASE_URL = process.env.BASE_URL;
const USERNAME = process.env.USERNAME;
const PASSWORD = process.env.PASSWORD;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;


async function main() {
	// SDK Example
    const ST2 = new ServicetradeSDK({
	    baseUrl: BASE_URL,
	    clientId: CLIENT_ID,
	    clientSecret: CLIENT_SECRET,
	    onSetAuth: (value) => console.log('onSetAuth', value),
	   onUnsetAuth: (value) => console.log('onUnsetAuth', value)
    });
	await runExample(ST2);

	// Legacy PHPSesssion Auth
	const ST = new ServicetradeLegacySDK({
	    baseUrl: BASE_URL,
	    username: USERNAME,
	    password: PASSWORD,
	    onSetCookie: (value) => console.log('onSetCookie', value),
	    onResetCookie: (value) => console.log('onResetCookie', value)
    });
    await runExample(ST);
}

async function runExample(client) {
	console.log("Running with auth type: " + client.constructor.name);
    await client.login();

	console.log("GETTING JOB");
	const jobs = await client.get('/job');
	const job = jobs.jobs[0];

	console.log("UPDATING JOB #" + job.number);
	await client.put('/job/' + job.id, {
		customerPo: 'PO #' + Math.random(),
	});

	console.log("ATTACHING TO JOB #" + job.number);
	const fileToUpload = __dirname + '/example.pdf';
	// get a node buffer
	const buffer = fs.readFileSync(fileToUpload);

	// construct an file object with it
	const attachment = {
		value: buffer,
		options: {
			filename: 'whatever.pdf',
			contentType: 'application/pdf'
		}
	};

	const params = {
		entityId: job.id,
		entityType: 3,
		purposeId: 7
	};

	await client.attach(params, attachment);

	console.log("ALL DONE, LOGGING OUT");
	await client.logout();

	console.log("DONE");
}

main();