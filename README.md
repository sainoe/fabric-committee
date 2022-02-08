## A governance application based on Hyperledger Fabric

### The solution enables committees to create proposals and take equitable decisions on-chain.

The Hyperledger Fabric network deploys a Go chaincode with methods allowing to:

1. Create/Consult new proposals
2. Submit vote/review
3. Expose results on the ledger


Each users have unique identity after being registered by the Fabric-CA or any external CA. The resulting encryption keys enables to apply the following security features.

* Proposals and votes are signed with users private key before being recorded to the ledger.

* Access Control decisions based on identity attributes enable to manage proposal creators (called chairman) and voters.


### All the chaincode methods and users registrations are accesssible through the fabric-cli and via HTTP request. 

### TODO: Front-end, revoke users.



