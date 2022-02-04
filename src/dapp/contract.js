import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            this.airlines.push(accts[counter]);

            while(this.passengers.length < 5) {
                this.passengers.push(accts[++counter]);
            }

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    getArilineName(callback) {
        let self = this;
        self.flightSuretyData.methods.getAirline(self.airlines[0]).call(callback);
    }

    purchaseInsurance(airline, flight, value, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            value: value,
            passager: self.passengers[0]
        }
        self.flightSuretyApp.methods
        .registerFlight(flight, airline)
        .send({from: self.passengers[0], value: Web3.utils.toWei(value, 'ether'), gas: 6721975}, (error, result) => {
            callback(error, payload)
        })
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }
}