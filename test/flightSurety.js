
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address);
    await config.flightSuretyApp.fund({from: config.firstAirline, value: 10 * config.weiMultiple})
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyApp.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-funded airline`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyApp.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access restricted to non funded airline");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for funded airline`, async function () {

      // Ensure that access is allowed for funded airline
      let accessDenied = false;
      try 
      {
          await config.flightSuretyApp.setOperatingStatus(false, {from: config.firstAirline});
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to funded airline");
      // Set it back for other tests to work
      await config.flightSuretyApp.setOperatingStatus(true, {from: config.firstAirline});
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyApp.setOperatingStatus(false, {from: config.firstAirline})

      let reverted = false;
      try 
      {
          await config.flightSuretyApp.registerAirline(config.testAddresses[0], "TEST 2", {from: config.firstAirline})
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];
    await config.flightSuretyApp.setOperatingStatus(true, {from: config.firstAirline});
    await config.flightSuretyApp.registerAirline(newAirline, "TEST2", {from: config.firstAirline});


    let {0: mark, 1: registered, 2: name, 3: confirmations, 4: funded} = await config.flightSuretyData.getAirline.call(newAirline); 

    // ASSERT
    assert.equal(funded, false, "Airline should not be able to register another airline if it hasn't provided funding");

    let reverted = false;
    try {
        await config.flightSuretyApp.registerAirline(accounts[3], "TEST2", {from: newAirline});
    } catch (e) {
        reverted = true;
    }
    assert.equal(reverted, true, "Access blocked for non funded airline");
  });

  it('(airline) airline is registered directly when there are less than 4', async () => {
    
    // ARRANGE
    let newAirline = accounts[3];
    await config.flightSuretyApp.registerAirline(newAirline, "TEST2", {from: config.firstAirline});


    let {0: mark, 1: registered, 2: name, 3: confirmations, 4: funded} = await config.flightSuretyData.getAirline.call(newAirline); 

    // ASSERT
    assert.equal(registered, true, "Airline should be registered");

  });

  it('(airline) airline is not registered directly when there are more than 4', async () => {
    
    // ARRANGE we have airlines 1, 2, 3 adding 4th
    await config.flightSuretyApp.registerAirline(accounts[4], "TEST2", {from: config.firstAirline});
    await config.flightSuretyApp.fund({from: accounts[2], value: 10 * config.weiMultiple});
    await config.flightSuretyApp.fund({from: accounts[3], value: 10 * config.weiMultiple});
    await config.flightSuretyApp.fund({from: accounts[4], value: 10 * config.weiMultiple});

    let nAirlines = await config.flightSuretyData.getNumberOfAirlines.call();
    assert.equal(nAirlines, 4, "There should be 4 funded airlines");

    let newAirline = accounts[5];
    await config.flightSuretyApp.registerAirline(newAirline, "TEST2", {from: config.firstAirline});

    let {0: mark, 1: registered, 2: name, 3: confirmations, 4: funded} = await config.flightSuretyData.getAirline.call(newAirline); 

    // ASSERT
    assert.equal(registered, false, "Airline should not be registered");

  });

  it('(airline) 5th airline is registered after 2 votes', async () => {
    
    // ARRANGE we have airlines 1, 2, 3 and 4. We have airline 5 that needs to be voted in
    let nAirlines = await config.flightSuretyData.getNumberOfAirlines.call();
    assert.equal(nAirlines, 4, "There should be 4 funded airlines");

    let newAirline = accounts[5];
    await config.flightSuretyApp.registerAirline(newAirline, "TEST2", {from: accounts[2]});

    let {0: mark, 1: registered, 2: name, 3: confirmations, 4: funded} = await config.flightSuretyData.getAirline.call(newAirline); 

    // ASSERT
    assert.equal(confirmations.length, 2, "There should be 2 confirmations");
    assert.equal(registered, true, "Airline should be registered");

  });
 

});
