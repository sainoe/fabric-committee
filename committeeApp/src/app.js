


delete process.env.http_proxy;
delete process.env.https_proxy;

var network = require('./fabric/network.js');
var utils = require('./utils/notarize.js');

// var utils = require('./utils')

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const fs = require('fs');
const path = require('path');


const configPath = path.join(process.cwd(), './network-config.json');
const configJSON = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configJSON);

let connection_file = config.connection_file;
let netAdmin = config.netAdmin;
let orgMSPID = config.orgMSPID;

const app = express();

app.use(cors());
app.use(express.json())
app.use(express.urlencoded({ extended: true }));


app.post('/notarize', async (req, res) => {
  let fileDigest = await utils.notarizeFile(req.body);
  console.log(fileDigest);
  return res.send(fileDigest);
});

app.post('/body', (req, res) => {
  console.log(req.body)
});


app.get('/index', (req, res) => {
  console.log("HIT\n")
  return res.send(JSON.parse('{"msg":"My DNA is anchored in my blocks. Who am I"}'));
});

app.get('/queryAll', async (req, res) => { // recover reviews of specific proposal in the front-end
  
  let networkObj = await network.connectToNetwork(netAdmin);
  let response = await network.invoke(networkObj, true, 'queryAll', '');
  let parsedResponse = await JSON.parse(response);

  res.send(parsedResponse);

});


app.post('/queryProposal', async (req, res) => { // recover reviews of specific proposal in the front-end
  let networkObj = await network.connectToNetwork(netAdmin);
  let response = await network.invoke(networkObj, true, 'queryProposal', req.body.proposalID);
  let parsedResponse = await JSON.parse(response);

  res.send(parsedResponse);
});


app.post('/createProposal', async (req, res) => { // add proposals
  let reqObj = req.body;
  let networkObj = await network.connectToNetwork(reqObj.userID);
  let proposalObj = await utils.notarizeFile(reqObj);
  let response =  await network.invoke(networkObj, false, 'createProposal', 
                    Object.values([proposalObj.digest, reqObj.filename, proposalObj.signature]));
  // let parsedResponse = await JSON.parse(response);

  res.send(response);

});

app.post('/submitDecision', async (req, res) => { // add rewiew to proposals
  let reqObj = req.body;
  let networkObj = await network.connectToNetwork(reqObj.userID);

  reqObj.datapayload = "";
  
  console.log(reqObj)
  let note =  (reqObj.note == undefined) ? "" : reqObj.note;
  reqObj.datapayload = (`${reqObj.proposalID}&${reqObj.choice}&${note}\n`);

  let decisionObj = await utils.notarizeFile(reqObj);
  let response =  await network.invoke(networkObj, false, 'submitDecision',
                     Object.values([reqObj.proposalID, reqObj.choice, decisionObj.signature, note]));
  res.send(response);

});


// app.get('/proposal/:proposalId', (req, res) => { // recover reviews of specific proposal in the front-end
//   return res.send(query.queryAsset(req.params.proposalId));
// });

// app.post('/proposal', (req, res) => { // add proposals
//   invoke.addProposal(...req.body.args);
// });

// app.post('/review', (req, res) => { // add rewiew to proposals
//   invoke.addReview(...req.body.args);
// });

app.post('/registerUser', async(req, res) => { // add users with committee access control
  let response = await network.registerUser(req.body.userID);
  return res.send(response);
  // admin.enrollAdmin(req.body.userId);
});

app.listen(process.env.PORT, () =>
  console.log(`Example app listening on port ${process.env.PORT}!`),
);

