/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';
const FabricCAServices = require('fabric-ca-client');
const { FileSystemWallet,  X509WalletMixin, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');


const configPath = path.join(process.cwd(), './network-config.json');
const configJSON = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configJSON);
let connection_file = config.connection_file;

let netAdmin = config.netAdmin;
let netAdminSecret = config.netAdminSecret;
let orgMSPID = config.orgMSPID;
let caName = config.caName;
let mspPath = config.mspPath;

const ccpPath = path.join(process.cwd(), connection_file);
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);



async function main() {
    try {

        // Create a new CA client for interacting with the CA.
    console.log(ccp);
        
        const caInfo = ccp.certificateAuthorities[caName];

        const caTLSCACertsPath = path.resolve(process.cwd(), mspPath, caInfo.tlsCACerts.path);
        const caTLSCACerts = fs.readFileSync(caTLSCACertsPath);
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = new FileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the admin user.
        const adminExists = await wallet.exists(netAdmin);
        if (adminExists) {
            console.log('An identity for the admin user "admin" already exists in the wallet');
            return;
        }

        // Enroll the admin user, and import the new identity into the wallet.
        const enrollment = await ca.enroll({ enrollmentID: netAdmin, enrollmentSecret: netAdminSecret });
        const identity = X509WalletMixin.createIdentity(orgMSPID, enrollment.certificate, enrollment.key.toBytes());
        await wallet.import(netAdmin, identity);
        console.log('Successfully enrolled admin user "admin" and imported it into the wallet');

    } catch (error) {
        console.error(`Failed to enroll admin user ' + ${netAdmin} + : ${error}`);
        console.log(error.stack)
        let response = {};
        response.error = error;
        return response;
        
    } finally {
        console.log('Done enrolling admin.');
    }
    return
}

main();
