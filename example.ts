import ServicetradeClientSession from './src/ServicetradeClientSession';
import ServicetradeClientBearerToken from './src/ServicetradeClientBearerToken';
import fs from 'fs';

// CUSTOMIZE THESE TO MEET YOUR NEEDS
const USERNAME = '';
const PASSWORD = '';
const BASE_URL = 'https://api.servicetrade.com';

// Example 1: Using Session-based Authentication (PHP Session)
async function exampleWithSession() {
    const ST = new ServicetradeClientSession({
        baseUrl: BASE_URL,
        username: USERNAME,
        password: PASSWORD
    });

    try {
        // LOG IN
        await ST.login();
        console.log("Logged in with session authentication");

        // GET LIST OF JOBS AND RETURN FIRST JOB FOUND
        const jobsResponse = await ST.get('/job');
        const job = jobsResponse.jobs[0];

        // UPDATE PO # ON JOB
        console.log("UPDATING JOB #" + job.number);
        const postData = {
            customerPo: 'PO #' + Math.random(),
        };
        const updatedJob = await ST.put('/job/' + job.id, postData);

        // ATTACH FILE TO JOB
        console.log("ATTACHING TO JOB #" + updatedJob.number);
        const fileToUpload = __dirname + '/example.pdf';

        // get a node buffer
        const buffer = fs.readFileSync(fileToUpload);

        // construct a file object with it
        const attachment = {
            value: buffer,
            options: {
                filename: 'whatever.pdf',
                contentType: 'application/pdf'
            }
        };

        const params = {
            entityId: updatedJob.id,
            entityType: 3,
            purposeId: 7
        };

        await ST.attach(params, attachment);

        // LOG OUT
        console.log("ALL DONE, LOGGING OUT");
        await ST.logout();

    } catch (error) {
        console.error("Error:", error);
    }
}

// Example 2: Using Bearer Token Authentication (OAuth2 Password Grant)
async function exampleWithBearerTokenPassword() {
    const ST = new ServicetradeClientBearerToken({
        baseUrl: BASE_URL,
        username: USERNAME,
        password: PASSWORD
    });

    try {
        // LOG IN
        await ST.login();
        console.log("Logged in with Bearer Token (password grant)");

        // GET LIST OF JOBS AND RETURN FIRST JOB FOUND
        const jobsResponse = await ST.get('/job');
        const job = jobsResponse.jobs[0];

        // UPDATE PO # ON JOB
        console.log("UPDATING JOB #" + job.number);
        const postData = {
            customerPo: 'PO #' + Math.random(),
        };
        await ST.put('/job/' + job.id, postData);

        console.log("ALL DONE");

    } catch (error) {
        console.error("Error:", error);
    }
}

// Example 3: Using Bearer Token Authentication (OAuth2 Client Credentials)
async function exampleWithBearerTokenClientCredentials() {
    const CLIENT_ID = '';
    const CLIENT_SECRET = '';

    const ST = new ServicetradeClientBearerToken({
        baseUrl: BASE_URL,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
    });

    try {
        // LOG IN
        await ST.login();
        console.log("Logged in with Bearer Token (client credentials)");

        // GET LIST OF JOBS
        const jobsResponse = await ST.get('/job');
        console.log(`Found ${jobsResponse.jobs.length} jobs`);

        console.log("ALL DONE");

    } catch (error) {
        console.error("Error:", error);
    }
}

// Example 4: Using callbacks for authentication state
async function exampleWithCallbacks() {
    const ST = new ServicetradeClientSession({
        baseUrl: BASE_URL,
        username: USERNAME,
        password: PASSWORD,
        onSetCookie: (cookie) => {
            console.log("Session cookie set:", cookie);
            // You could persist this cookie to a file or database here
        },
        onResetCookie: () => {
            console.log("Session cookie cleared");
            // You could remove persisted cookie here
        }
    });

    try {
        await ST.login();

        // Do some work...
        const jobsResponse = await ST.get('/job');
        console.log(`Found ${jobsResponse.jobs.length} jobs`);

        await ST.logout();

    } catch (error) {
        console.error("Error:", error);
    }
}

// Example 5: Using custom headers
async function exampleWithCustomHeaders() {
    const ST = new ServicetradeClientSession({
        baseUrl: BASE_URL,
        username: USERNAME,
        password: PASSWORD,
        userAgent: 'MyApp/1.0.0'
    });

    try {
        await ST.login();

        // Set custom headers
        ST.setCustomHeaders('X-API-Version', 'v2');
        ST.setCustomHeaders('X-Client-ID', 'my-client-123');

        const jobsResponse = await ST.get('/job');
        console.log(`Found ${jobsResponse.jobs.length} jobs`);

        await ST.logout();

    } catch (error) {
        console.error("Error:", error);
    }
}

// Uncomment the example you want to run:
// exampleWithSession();
// exampleWithBearerTokenPassword();
// exampleWithBearerTokenClientCredentials();
// exampleWithCallbacks();
// exampleWithCustomHeaders();
