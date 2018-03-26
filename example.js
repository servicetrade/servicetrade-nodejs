// CUSTOMIZE THESE TO MEET YOUR NEEDS
const USERNAME = '';
const PASSWORD = '';
const BASE_URL = 'https://api.servicetrade.com';

const ST = require('./index')({
	baseUrl: BASE_URL,
	username: USERNAME,
	password: PASSWORD
});
const fs = require('fs');

// LOG IN
ST.login()

	// GET LIST OF JOBS AND RETURN FIRST JOB FOUND
	.then(function() {
		return ST.get('/job').then(function(c) {
			var job = c.jobs[0];
			return job;
		})
	})

	// UPDATE PO # ON JOB
	.then(function(job) {
		console.log("UPDATING JOB #" + job.number);

		const postData = {
			customerPo: 'PO #' + Math.random(),
		};

		return ST.put('/job/' + job.id, postData);
	})

	// ATTACH FILE TO JOB
	.then(function(job) {
		console.log("ATTACHING TO JOB #" + job.number);

		const fileToUpload = __dirname + '/example.pdf';
		/** simple: read file from filesystem
		const attachment = fs.createReadStream(fileToUpload);
		*/

		/** complicated: use node buffer
		 */
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

		return ST.attach(params, attachment);
	})

	// LOG OUT
	.then(function() {
		console.log("ALL DONE, LOGGING OUT");

		return ST.logout();
	});

