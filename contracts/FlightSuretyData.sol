pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => uint256)  authorizedContracts;
    mapping(string => Insurance[]) insurances;
    mapping(address => mapping(string => bool)) insurancesByCustomer; 
    mapping(address => uint256) credit;

    address[] private multiCalls = new address[](0);

    mapping(address => Airline) airlines;
    int256 nAirlines;

    struct Airline {
        int256 mark;
        bool funded;
        string name;
        address[] confirmations;
        bool registered;
    }

    struct Insurance {
        address airline;
        uint256 value;
        bool paidOut;
        address customer;
    }

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    address airline,
                                    string name
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        airlines[airline] = Airline(1, false, name, new address[](0), true);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }


    modifier isCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized");
        _;
    }
    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function authorizeContract(address c) external requireContractOwner {
        authorizedContracts[c] = 1;
    }

    function deauthorizeContract(address c) external requireContractOwner {
        delete authorizedContracts[c];
    }

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }

    function getAirline(address a) public view returns(int256, bool, string, address[], bool) {
        return (airlines[a].mark, airlines[a].registered, airlines[a].name, airlines[a].confirmations, airlines[a].funded);
    }

    function getNumberOfAirlines() public view returns (int256) {
        return nAirlines;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external 
                            isCallerAuthorized
    {
        require(mode != operational, "new mode must be different from existing mode");
        require(airlines[tx.origin].funded, "caller must be registered and funded airline");
        bool isDuplicate = false;
        for (uint c = 0; c < multiCalls.length; c++) {
            if (multiCalls[c] == tx.origin) {
                isDuplicate = true;
                break;
            }
        }
        require(!isDuplicate, "caller has already called this function");

        multiCalls.push(tx.origin);
        if (multiCalls.length > uint256(nAirlines / 2)) {
            operational = mode;
            multiCalls = new address[](0);
        } 
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (   
                                address a,
                                string name
                            )
                            external
                            isCallerAuthorized
                            requireIsOperational
                            returns(bool success, uint256 votes)
    {
        if (nAirlines < 4) {
            require(airlines[tx.origin].funded, "Only registered airlines can register other airlines");
            require(airlines[a].mark == 0, "Airline has already been registered");
            airlines[a] = Airline(1, false, name, new address[](0), true);
            return (true, 0);
        } else {
            if (airlines[a].mark == 0) {
                airlines[a] = Airline(1, false, name, new address[](0), false);
            }
            if (airlines[tx.origin].funded) {
                bool isDuplicate = false;
                for (uint c = 0; c < airlines[a].confirmations.length; c++) {
                    if (airlines[a].confirmations[c] == tx.origin) {
                        isDuplicate = true;
                        break;
                    }
                }
                require(!isDuplicate, "confirm register has already been called by this airline");
                airlines[a].confirmations.push(tx.origin);
                if (airlines[a].confirmations.length >= uint256(nAirlines / 2)) {
                    airlines[a].registered = true;
                }
                return (true, airlines[a].confirmations.length);
            }
            return (true, 0);
        }
    }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            ( 
                                string flight,
                                address airline                           
                            )
                            external
                            payable
                            isCallerAuthorized
                            requireIsOperational
    {
        require(msg.value <= 1 ether, "Payment must be lower than 1 ether");
        require(airlines[airline].funded, "Airline is not funded");
        require(!insurancesByCustomer[tx.origin][flight], "Customer already purchased this insurance");
        insurances[flight].push(Insurance(airline, msg.value, false, tx.origin));
        insurancesByCustomer[tx.origin][flight] = true;
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    string flight
                                )
                                external
                                isCallerAuthorized
                                requireIsOperational
    {
        for (uint c = 0; c < insurances[flight].length; c++) {
            if (!insurances[flight][c].paidOut) {
                insurances[flight][c].paidOut = true;
                uint256 aux = credit[insurances[flight][c].customer]; 
                uint256 add = uint256(aux / 2);
                credit[insurances[flight][c].customer] += add;
            }
        } 
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            requireIsOperational
    {
        require(credit[tx.origin] > 0, "No funds to transfer");
        uint256 cred = credit[tx.origin];
        credit[tx.origin] = 0;
        tx.origin.transfer(cred);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            payable
                            isCallerAuthorized
                            requireIsOperational
    {
        require(airlines[tx.origin].mark == 1, "Airline must be registered");
        require(airlines[tx.origin].registered, "Airline registration must be confirmed");
        require(msg.value == 10 ether, "Funding value must be 10 ether");
        require(!airlines[tx.origin].funded, "Airline is already funded");

        airlines[tx.origin].funded = true;
        nAirlines = nAirlines + 1;
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

