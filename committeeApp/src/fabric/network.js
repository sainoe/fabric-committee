'use strict';

const { FileSystemWallet,  X509WalletMixin, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const util = require('util');
// const { KJUR, KEYUTIL } = require('jsrsasign');
// const CryptoJS = require('crypto-js');

const configPath = path.join(process.cwd(), './network-config.json');
const configJSON = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configJSON);
let connection_file = config.connection_file;

let netAdmin = config.netAdmin;
let orgMSPID = config.orgMSPID;

const ccpPath = path.join(process.cwd(), connection_file);
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);



exports.connectToNetwork = async function (userID) {
    console.log(`try to connect user: ${userID}\n`)

    const gateway = new Gateway();

    try {

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);

                // Check to see if we've already enrolled the userId.
        const userExists = await wallet.exists(userID);
        if (!userExists) {
            console.log('An identity for the user ' + userID + ' does not exist in the wallet');
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Instantiate a new gateway for connecting to our peer node.
        await gateway.connect(ccp, { wallet, identity: userID, discovery: { enabled: false } });
        
        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('committee');

        let networkObj = {
            contract: contract,
            network: network,
            gateway: gateway
        };

        return networkObj;

    } catch (error) {
        console.error(`Failed to connect to the network: ${error}`);
        console.log(error.stack)
        let response = {};
        response.error = error;
        return response;

    } finally {
        console.log('Done connecting to the network.');
    }
};

exports.registerUser = async function (userID) {
    console.log(userID);
    
    try {
        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists(userID);
        if (userExists) {
            let response = `An identity for the user ${userID} already exists in the wallet`;
            console.log(response);
            return response;
        }

        // Check to see if we've already enrolled the admin user.
        const adminExists = await wallet.exists(netAdmin);
        if (!adminExists) {
            console.log('An identity for the admin user "admin" does not exist in the wallet');
            console.log('Run the enrollAdmin.js application before retrying');
            return '';
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccpPath, { wallet, identity: netAdmin, discovery: { enabled: true, asLocalhost: true } });

        // Get the CA client object from the gateway for interacting with the CA.
        const ca = gateway.getClient().getCertificateAuthority();
        const adminIdentity = gateway.getCurrentIdentity();

        // Register the user, enroll the user, and import the new identity into the wallet.
        const secret = await ca.register({ affiliation: 'org1.department1', enrollmentID: userID, role: 'client', attrs:[{test:"test"}]}, adminIdentity);
        const enrollment = await ca.enroll({ enrollmentID: userID, enrollmentSecret: secret });
        const userIdentity = X509WalletMixin.createIdentity(orgMSPID, enrollment.certificate, enrollment.key.toBytes());
        await wallet.import(userID, userIdentity);
        let response = `Successfully registered user: ${userID}`;
        console.log(response);
        return response;

    } catch (error) {
        console.error(`Failed to registering user: ${error}`);
        console.log(error.stack)
        let response = {};
        response.error = error;
        return JSON.stringify(response.error.message);

    } finally {
        console.log('Done registering user.')
    }
};


exports.invoke = async function(networkObj, isQuery, func, args) {
    try {
        console.log('Invoke call');
        console.log(`isQuery: ${isQuery}, func: ${func}, args: ${args}`)
        // console.log(util.inspect(networkObj));
        if (isQuery === true) {
            console.log('inside isQuery.')
            
            if (args){
                console.log('inside isQuery, args')

                let response = await networkObj.contract.evaluateTransaction('readProposal', args);
                console.log(response);
                
                await networkObj.gateway.disconnect();
                
                return response;

            } else {
                let response = await networkObj.contract.evaluateTransaction('readAllProposal');
                console.log(response);
                
                await networkObj.gateway.disconnect();
                
                return response;
            }
        } else {
            console.log('notQuery');
            console.log(args);
            
            let response = await networkObj.contract.submitTransaction(func, ...args)
            console.log(response);
            console.log(`transaction: ${func} + ${args} has been submitted.`)

            await networkObj.gateway.disconnect();

            return response;
        }

    }

    catch (error){
        console.error(`Failed to evaluate transaction: ${error}`);
        console.log(error.stack)
        let response = {};
        response.error = error;
        return JSON.stringify(response.error.message);
    }

    finally {
        console.log('Done submitting transaction.');
    }
};




// exports.addReview = async function(user, proposalId, choice, note) {
//     try {

//         // Create a new file system based wallet for managing identities.
//         const walletPath = path.join(process.cwd(), 'wallet');
//         const wallet = new FileSystemWallet(walletPath);

//         // Collect input parameters
//         // user: who initiates this query, can be anyone in the wallet
//         // filename: the file to be validated
//         // const filename = process.argv[3];

//         // Check to see if we've already enrolled the userId.
//         const userExists = await wallet.exists(user);
//         if (!userExists) {
//             console.log('An identity for the user ' + user + ' does not exist in the wallet');
//             console.log('Run the registerUser.js application before retrying');
//             return;
//         }

//         const walletContents = await wallet.export(user);
//         const userPrivateKey = walletContents.privateKey;

//         var reviewStr = user + choice + note;
//         console.log(reviewStr);

//         var sig = new KJUR.crypto.Signature({"alg": "SHA256withECDSA"});
//         sig.init(userPrivateKey, "");
//         sig.updateHex(reviewStr);
//         var sigValueHex = sig.sign(reviewStr);
//         var sigValueBase64 = new Buffer(sigValueHex, 'hex').toString('base64');
//         console.log("Signature: " + sigValueBase64);

//         // Create a new gateway for connecting to our peer node.
//         const gateway = new Gateway();
//         await gateway.connect(ccp, { wallet, identity: user, discovery: { enabled: false } });
        
//         // Get the network (channel) our contract is deployed to.
//         const network = await gateway.getNetwork('mychannel');

//         // Get the contract from the network.
//         const contract = network.getContract('committee');

//         // Submit the specified transaction.
//         // await contract.submitTransaction('createProposal', assetId.toString(), assetName.toString());
//         // console.log('Transaction has been submitted');

//         const result = await contract.submitTransaction('reviewProposal', proposalId.toString(), choice.toString());
//         console.log(`${result} : Transaction has been submitted`);
    
//         // Disconnect from the gateway.
//         await gateway.disconnect();
    
//         } catch (error) {
//             console.error(`Failed to submit transaction: ${error}`);
//             process.exit(1);
//         }
// };



// var addProposal = async function (user, assetId, assetName) {

//     try {

//         // Create a new file system based wallet for managing identities.
//         const walletPath = path.join(process.cwd(), 'wallet');
//         const wallet = new FileSystemWallet(walletPath);

//         // Collect input parameters
//         // user: who initiates this query, can be anyone in the wallet
//         // filename: the file to be validated
//         // const filename = process.argv[3];

//         // Check to see if we've already enrolled the userId.
//         const userExists = await wallet.exists(user);
//         if (!userExists) {
//             console.log('An identity for the user ' + user + ' does not exist in the wallet');
//             console.log('Run the registerUser.js application before retrying');
//             return;
//         }

//         // calculate Hash from the specified file
//         // const fileLoaded = fs.readFileSync(filename, 'utf8');
//         // var hashToAction = CryptoJS.SHA256(fileLoaded).toString();
//         // console.log("Hash of the file: " + hashToAction);

//         // extract certificate info from wallet

//         const walletContents = await wallet.export(user);
//         const userPrivateKey = walletContents.privateKey;

        
//         var assetStr = assetId + assetName;
        


//         var sig = new KJUR.crypto.Signature({"alg": "SHA256withECDSA"});
//         sig.init(userPrivateKey, "");
//         sig.updateHex(assetStr);
//         var sigValueHex = sig.sign();
//         var sigValueBase64 = new Buffer(sigValueHex, 'hex').toString('base64');
//         console.log("Signature: " + sigValueBase64);

//         // Create a new gateway for connecting to our peer node.
//         const gateway = new Gateway();
//         await gateway.connect(ccp, { wallet, identity: user, discovery: { enabled: false } });
        
//         // Get the network (channel) our contract is deployed to.
//         const network = await gateway.getNetwork('mychannel');

//         // Get the contract from the network.
//         const contract = network.getContract('committee');

//         // Submit the specified transaction.
//         await contract.submitTransaction('createProposal', assetId.toString(), assetName.toString());
//         console.log('Transaction has been submitted');

//         // Disconnect from the gateway.
//         await gateway.disconnect();

//     } catch (error) {
//         console.error(`Failed to submit transaction: ${error}`);
//         process.exit(1);
//     }
// }


// module.exports = {
//     addProposal: addProposal,
//     addReview : addReview
// };