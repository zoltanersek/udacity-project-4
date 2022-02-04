import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";
import express from "express";
import "babel-polyfill";

const ORACLES = 20;
const CODES = [0, 10, 20, 30, 40, 50];

let config = Config["localhost"];
let web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);

setup();

function getRandomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!"
  });
});

async function setup() {
  console.log("starting setup")
  const accounts = await web3.eth.getAccounts();
  web3.eth.defaultAccount = accounts[0];
  console.log("funding from first airline");
  let flightSuretyApp = new web3.eth.Contract(
    FlightSuretyApp.abi,
    config.appAddress
  );
  flightSuretyApp.methods.fund().send({from: accounts[1], value: Web3.utils.toWei('10', 'ether')})

  const fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();

  for (let i = 0; i < ORACLES; i++) {
    await flightSuretyApp.methods
      .registerOracle()
      .send({ value: fee, from: accounts[10 + i], gas: 3000000 });
      console.log("REGISTERED ORACLE ", i);
  }

  flightSuretyApp.events.OracleRequest(
    {
      fromBlock: 0
    },
    async (error, event) => {
      if (error) {
        console.log(error);
      } else {
        for (let i = 0; i < ORACLES; i++) {
          let indexes = await flightSuretyApp.methods.getMyIndexes().call({from: accounts[10 + i]});
          if (indexes.indexOf(event.returnValues.index) >= 0) {
            const pos = 2;
            console.log("ORACLE ", i, " responding to request",  event.returnValues.index, "with code", CODES[pos]);
            await flightSuretyApp.methods
              .submitOracleResponse(
                event.returnValues.index,
                event.returnValues.airline,
                event.returnValues.flight,
                event.returnValues.timestamp,
                CODES[pos]
              )
              .send({ from: accounts[10 + i], gas: 5000000 });
          }
        }
      }
    }
  );
}

export default app;