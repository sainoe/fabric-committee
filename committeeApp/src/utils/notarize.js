'use strict';


const { FileSystemWallet } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const { KJUR, KEYUTIL } = require('jsrsasign');
const CryptoJS = require('crypto-js');

// const ccpPath = path.resolve(__dirname, '..', 'basic-network', 'connection.json');
// const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
// const ccp = JSON.parse(ccpJSON);

exports.notarizeFile = async function(body) {
    try {
        console.log(body.userID);
        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);

        // Collect input parameters
        // user: who initiates this query, can be anyone in the wallet, defined by the the email user, i.e. "user2@itu.int" -> "user2"
        // filename: the file to be validated
        const user = body.userID;
        const filename = body.filename; 

        // Check to see if we've already enrolled the user.
        const userExists = await wallet.exists(user);
        if (!userExists) {
            console.log('An identity for the user ' + user + ' does not exist in the wallet');
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // calculate Hash from the specified file
        // const fileLoaded = fs.readFileSync(filename, 'utf8');
        var hashToAction = CryptoJS.SHA256(body.datapayload).toString();
        console.log("Hash of the file: " + hashToAction);

        // extract certificate info from wallet

        const walletContents = await wallet.export(user);
        const userPrivateKey = walletContents.privateKey;

        var sig = new KJUR.crypto.Signature({"alg": "SHA256withECDSA"});
        sig.init(userPrivateKey, "");
        sig.updateHex(hashToAction);
        var sigValueHex = sig.sign();
        var sigValueBase64 = new Buffer(sigValueHex, 'hex').toString('base64');
        console.log("Signature: " + sigValueBase64);

        return {digest: hashToAction, signature: sigValueBase64};


        // Create a new gateway for connecting to our peer node.

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        return error;
    } finally {
        console.log('Notarization done.')
    }
}

