package main


import (
	"bytes"
	"time"
	"errors"
    "encoding/json"
	"fmt"
	"strconv"
    "github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
	"github.com/hyperledger/fabric/core/chaincode/shim/ext/cid"
	// "github.com/hyperledger/fabric/vendor"
)


// Create the struct to tie the methods to.
type CmtCC struct {
}

type Proposal struct {
	PID             string      `json:"id"`
	Name            string      `json:"name"`
//	Affiliation		string		`json: affiliation`
	Reviews			map[string]Review	`json:"reviews"`
	ReviewsCount   string			`json:"reviewsCount"`
	Signature		string		`json:"signature"`
	Timestamp		string		`json:"timestamp"`
}

type Review struct {
	RID				string 		`json:"id"`// unique Id in MSP or Handle ID
	Choice          string		`json:"choice"`
	Note			string 		`json:"note"`
	Signature		string		`json:"signature"`
	Timestamp		string		`json:"timestamp"`
}

// ===================================================================================
// Main
// ===================================================================================
func main() {
	err := shim.Start(new(CmtCC))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}


func (dcc *CmtCC) Init(stub shim.ChaincodeStubInterface) pb.Response {
	var err error
	fmt.Println("\nCommitteApp is Starting Up\n")

	_, args := stub.GetFunctionAndParameters()

    if len(args) != 0 {
        return shim.Error("Incorrect number of arguments. Expecting 0")
    }

	/* Init ledgers with several proposal assets */
	// dcc.createProposal(stub, []string{"prop0", "prop0data0"})
	// dcc.createProposal(stub, []string{"prop1", "prop0data1"})
	// dcc.createProposal(stub, []string{"prop2", "prop0data2"})
	// dcc.createProposal(stub, []string{"prop3", "prop0data3"})


	err = stub.PutState("committe_contract_version", []byte("1.0"))
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("\n - App ready for action")
	return shim.Success([]byte("Initialisation complete"))
}


func (dcc *CmtCC) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()

    // Handle different functions
    if function == "init" { //initialize the chaincode state, used as reset
        return dcc.Init(stub)
    } else if function == "createProposal" {
        return dcc.createProposal(stub, args)
	} else if function == "readProposal" {
		return dcc.readProposal(stub, args)
	} else if function == "readAllProposal" {
		return dcc.readAllProposal(stub)
	} else if function == "submitDecision" {
        return dcc.submitDecision(stub, args)
	}
		
 	// In any other case.
 	fmt.Println("\t*** ERROR: Invoke function did not find ChainCode function: " + function) // Error handling.
 	return shim.Error(" --- INVOKE ERROR: Received unknown function invocation")
}

func (dcc *CmtCC) createProposal(stub shim.ChaincodeStubInterface, args []string) pb.Response {
// Only adminstrators can create/modify proposals
	var proposalName, proposalId, proposalSig string
	var err error

	chairmanerr := cid.AssertAttributeValue(stub, "hf.EnrollmentID", "chairman")
	if chairmanerr != nil {
		return shim.Error("Incorrect user's certficate")
	} else {
		fmt.Println("Chairman authenticated.")
	}

	// x509, _ := cid.GetX509Certificate(stub) 

	// fmt.Println(x509.Subject)
	// if err != nil {
	// 	return shim.Error("Incorrect user's certficate")
	// } else if org := x509.Subject.Organization[0]; org != "org1.example.com" { // x509.Subject.CommonName == Admin@org1.example.com or Chairman
	// 	return shim.Error(fmt.Sprintf("Only Admin can set new value. Incorrect invoker: %s", org))
	// } else {
	// 	fmt.Printf("User %s authenticated ! \n", org)
	// }


	if len(args) != 3 {
        return shim.Error("Incorrect number of arguments. Expecting 3")
    }

	
	proposalId = args[0]
	proposalName = args[1]
	proposalSig	 = args[2]
	proposalReviews := make(map[string]Review)

	// Check if proposal already exists

	_, err = getProposal(stub, proposalId) 
	if err == nil {
		return shim.Error("This proposal already exists")
	}

	proposal := &Proposal{proposalId, proposalName, proposalReviews, "0", proposalSig, time.Now().Format(time.RFC3339)}
	proposalJSONasBytes, err := json.Marshal(proposal)
	if err != nil {
		return shim.Error(err.Error())
	}

	err = stub.PutState(proposalId, proposalJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	// ==== Proposal saved and indexed. Return success ====
	fmt.Println("- End init proposal")
	return shim.Success(nil)
}

func (dcc *CmtCC) readProposal(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	var jsonResp string
	if len(args) != 1 {
        return shim.Error("Incorrect number of arguments. Expecting name of the proposal to query")
	}

	proposalAsBytes, err := stub.GetState(args[0])

	if err != nil {
		jsonResp = "{\"Error\":\"Failed to get state for " + args[0] + "\"}"
		return shim.Error(jsonResp)
	} else if proposalAsBytes == nil {
		jsonResp = "{\"Error\":\"Proposal does not exist: " + args[0] + "\"}"
		return shim.Error(jsonResp)	}

	return shim.Success(proposalAsBytes)
}


func (dcc *CmtCC) readAllProposal(stub shim.ChaincodeStubInterface) pb.Response {

	resultsIterator, err := stub.GetStateByRange("","");
	if err != nil {
		return shim.Error(err.Error())
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing QueryResults
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return shim.Error(err.Error())
		}
		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"Key\":")
		buffer.WriteString("\"")
		buffer.WriteString(queryResponse.Key)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Record\":")
		// Record is a JSON object, so we write as-is
		buffer.WriteString(string(queryResponse.Value))
		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	fmt.Printf("- queryAllAssets:\n%s\n", buffer.String())

	return shim.Success(buffer.Bytes())
}

func (dcc *CmtCC) submitDecision(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	fmt.Println("inSubmit");

	var reviewId, reviewChoice, reviewSig, reviewNote string

	if len(args) < 3 {
        return shim.Error("Incorrect number of arguments. Expecting 4")
	}

	usererr := cid.AssertAttributeValue(stub, "hf.Affiliation", "org1.department1")
	if usererr != nil {
		return shim.Error("Incorrect user's certficate")
	} else {
		fmt.Println("Committe user authenticated.")
	}

	// Verify if the proposal exists
	
	proposal, err := getProposal(stub, args[0])
	if err != nil {
		shim.Error(err.Error())
	}	

	// Verify if the user invoker is authorized to review this proposal

	// x509, err := cid.GetX509Certificate(stub) 
	// if err != nil {
	// 	return shim.Error(err.Error())
	// } else if x509.Subject.OrganizationalUnit[0] != "COP" { //proposal.affiliation
	// 	fmt.Println(x509.Subject)
	// 	return shim.Error(fmt.Sprintf("User's organization is not in access control of proposal %s", args[0]))
	// }	

	// Get some user invoker certificate attributes
	
	// attr, _, attrerr := cid.GetAttributeValue(stub, "test")
	// if attrerr != nil {
	// 	return shim.Error("Incorrect user's certficate")
	// } else {
	// 	fmt.Println(attr);
	// 	return shim.Success([]byte(attr))
	// }
	
	
	reviewId, _, err = cid.GetAttributeValue(stub, "hf.EnrollmentID")
	if err != nil {
		return shim.Error("Incorrect user's certficate")
	} else {
		fmt.Printf("User authenticated: %s", reviewId)
	}

	// Verify if the user invoker already reviewed this proposal

	// if _, exists := proposal.Reviews[reviewId]; exists {
	// 	return shim.Error(fmt.Sprintf("User %s already reviewed proposal: %s", reviewId, args[0]))
	// }

	// create a review

	reviewChoice = args[1]
	reviewSig = args[2]

	
	if len(args) == 4 {
		reviewNote = args[3]
	} else {
		reviewNote = "" // We can't add new review's note afterwards
	}

	review := Review{reviewId, reviewChoice, reviewSig, reviewNote, time.Now().Format(time.RFC3339)}

	// add review to proposal

	reviewCount, err := strconv.Atoi(proposal.ReviewsCount)
	if err != nil {
		return shim.Error(err.Error())
		// return shim.Error(fmt.Sprintf("Review: %s", proposal.ReviewsCount))
	}

	proposal.Reviews[reviewId] = review
	proposal.ReviewsCount = strconv.Itoa(reviewCount + 1)

	proposalJSONasBytes, err := json.Marshal(proposal)
	if err != nil {
		return shim.Error(err.Error())
	}

	// store reviewed proposal

	err = stub.PutState(proposal.PID, proposalJSONasBytes)
	if err != nil {
		return shim.Error(err.Error())
	}

	fmt.Println("- Proposal reviewed")
	return shim.Success(nil)

}

func getProposal(stub shim.ChaincodeStubInterface, pid string) (Proposal, error) {
	var jsonResp string
	var proposal Proposal
	var err error

	proposalAsBytes, err := stub.GetState(pid)

	if err != nil {
		jsonResp = "{\"Error\":\"Failed to get state for " + pid + "\"}"
		return proposal, errors.New(jsonResp)
	} else if proposalAsBytes == nil {
		jsonResp = "{\"Error\":\"Proposal does not exist: " + pid + "\"}"
		return proposal, errors.New(jsonResp)
	}
	json.Unmarshal(proposalAsBytes, &proposal)

	return proposal, nil
}


// func getReview(stub shim.ChaincodeStubInterface, rid string) (Review, error) {
// 	var jsonResp string
// 	var review Review
// 	var err error
	
// 	reviewAsBytes, err := stub.GetState(rid)

// 	if err != nil {
// 		jsonResp = "{\"Error\":\"Failed to get state for " + rid + "\"}"
// 		return review, errors.New(jsonResp)
// 	} else if reviewAsBytes == nil {
// 		jsonResp = "{\"Error\":\"Review does not exist: " + rid + "\"}"
// 		return review, errors.New(jsonResp)
// 	}

// 	json.Unmarshal(reviewAsBytes, &review)

// 	return review, nil
// }



