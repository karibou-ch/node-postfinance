/**
 * Daimyo - unit tests for the main Daimyo module
 * Copyright (c)2011, by Branko Vukelic.
 * Licensed under MIT license (see LICENSE)
 */

var assert = require('assert');
var should = require('should');
var getAdjustedDateparts = require('./fixtures/helpers').getAdjustedDateparts;

describe("postfinance.create", function(){
  var postfinance = require('../index.js');
  var messages = require('../lib/messages');
  var testNonExpiredDate = getAdjustedDateparts(12); // One year in future
  var testExpiredDate = getAdjustedDateparts(-12); // One year ago

  var testSettings = require('../config');


  // testSettings.sandbox = true;
  testSettings.enabled = false; // Does not make any actual API calls if false
  testSettings.debug = false; // Enables *blocking* debug output to STDOUT


  before(function(done){
    done()
  });
  var card;

  var testAlias={
    alias:"testalias.1",
    aliasUsage:"karibou payment"
  }

var requestPaymentPage = {
    //Credit
    paymentMethod: 'Postfinance card',
    orderId:'oidYYYY1',
    amount:123.00,
    email:'o@o.com',
    firstName: 'Foo',
    lastName: 'Bar',
    address1: '221 Foo st',
    address2: '', // blank
    city: 'genève', // blank
    zip: '1208',
    groupId:'groupXXXXXX',
    custom:'hello world'
  };

  var testCard = {
    number: '5399999999999999', // MasterCard
    csc: '111',
    year: testNonExpiredDate[0].toString(),
    month: testNonExpiredDate[1].toString(),
    firstName: 'Foo',
    lastName: 'Bar',
    address1: '221 Foo st',
    address2: '', // blank
    city: '', // blank
    state: '', // blank
    zip: '1208'
  };

  var sandboxValidCard = {
    number: '4111-1111-1111-1111',
    csc: '123',
    year: testNonExpiredDate[0].toString(),
    month: testNonExpiredDate[1].toString()
    // No other extra data, this is only for testing transactions
  };

  var sandboxInvalidCard = {
    number: '4242-4242-4242-4242',
    csc: '123',
    year: testNonExpiredDate[0].toString(),
    month: testNonExpiredDate[1].toString()
    // No other extra data, this is only for testing transactions
  };

  var bogusCard = {
    number: '2420318231',
    csc: '14111',
    year: testExpiredDate[0].toString(),
    month: testExpiredDate[1].toString()
  };

  var globalCard;

  it("Configure and lock configuration", function(done){
    testSettings.allowMultipleSetOption = false;
    postfinance.configure(testSettings);

    done()
  });





  it("Create an alias", function(done){    
    this.timeout(10000);
    var Card = postfinance.Card;
    var card = new Card(testCard);
    
    card.should.have.property('create');

    card.create(testAlias,function(err,res) {
      // ORDERID="00123" 
      // PAYID="35562138" 
      // NCSTATUS="0" 
      // NCERROR="0" 
      // ACCEPTANCE="test123" 
      // STATUS="5" 
      // IPCTY="99" 
      // CCCTY="US" 
      // ECI="7" 
      // CVCCheck="NO" 
      // AAVCheck="NO" 
      // VC="NO" 
      // amount="1" currency="CHF" PM="CreditCard" BRAND="MasterCard" 
      // ALIAS="testalias" 
      // NCERRORPLUS="!"
      should.not.exist(err);
      card.alias.should.equal(testAlias.alias);
      card.should.have.property('payId');
      done()
    });
  });


  it.skip("Alias can load payment method", function(done){    
    this.timeout(10000);
    var Card = postfinance.Card;
    var card = new Card(testAlias);

    card.should.have.property('load');
    card.load(function(err) {
      should.not.exist(err);
      card.number.should.equal('XXXXXXXXXXXX9999')
      card.issuer.should.equal('MasterCard')
      card.month.should.equal(10)
      card.year.should.equal(2015)
      done()
    });
  });





  it.skip("Created card can load payment method data", function(done){
    var Card = postfinance.Card;
    var card = new Card(testCard);
    var card1;
    var alias;
   
    done()
  });

  it.skip("Create a bad payment method", function(done){
    var card = new postfinance.Card(bogusCard);

    function onLoad(err) {
      done()
    }

    card.create(testAlias,function(err) {
      card.load(onLoad);
    });
  });

  it.skip("Card has _dirty property which lists changed fields", function(done){
    // Initially, all fields are dirty
    var Card = postfinance.Card;
    var card = new Card(testCard);
    var alias;

    card.should.have.property('_dirty');
    card._dirty.should.not.be.empty;
    card._dirty.should.contain('number');
    card._dirty.should.contain('csc');
    card._dirty.should.contain('year');
    card._dirty.should.contain('month');
    card._dirty.should.contain('firstName');
    card._dirty.should.contain('lastName');
    card._dirty.should.contain('address1');
    card._dirty.should.contain('zip');

    card.createAlias(testAlias,function(err) {
      should.not.exist(err);
      card._dirty.should.be.empty;
      card.load(function(err) {
        should.not.exist(err);
        card._dirty.should.be.empty;
        card.year = '17';
        card._dirty.should.contain('year');
        card.month = '10';
        card._dirty.should.contain('month');
        card.firstName = 'Foom';
        card._dirty.should.contain('firstName');
      });
    });
    done()
  });

  it.skip("Updating a modified card", function(done){
    var Card = postfinance.Card;
    var card;

    function onUpdate() {
      }

    card = new Card(testCard);
    card.createAlias(testAlias,function() {
      card.city.should.not.equal('Smallville');
      card.city = 'Smallville';
      card.month = '12';
      card._dirty.should.contain('city');
      card._dirty.should.contain('month');
      card.update(function(err) {
        card._dirty.should.be.empty;
        card.city.should.equal('Smallville');
        card.month.should.equal(12);
        card.should.have.property('method');
        card.method.should.have.property('createdAt');
        card.method.createdAt.should.be.instanceof(Date);
        card.method.should.have.property('updatedAt');
        card.method.updatedAt.should.be.instanceof(Date);
        card.method.should.have.property('retained');
        card.method.retained.should.equal(false);
        card.method.should.have.property('redacted');
        card.method.redacted.should.equal(false);
        card.firstName.should.equal(testCard.firstName);
        card.lastName.should.equal(testCard.lastName);
        card.address1.should.equal(testCard.address1);
      });
    });
    done()
  });

  it.skip("Retain card", function(done){
    var card = new postfinance.Card(testCard);
    done()
  });

  it.skip("Redact card", function(done){
    var card = new postfinance.Card(testCard);
    done()
  });

  it("Creating new transaction object throws if no operation", function(done){
    var transaction;

    assert.throws(function() {
      transaction = new postfinance.Transaction({
        operation: null, 
        amount: 10
      });
    });
    done()
  });

  it("Creating new transaction throws with missing orderid", function(done){
    var transaction;

    assert.throws(function() {
      transaction = new postfinance.Transaction({
        operation: 'purchase',
        amount:10
      });
    });
    done()
  });


  it("Maintenance of transaction throws with missing payId", function(done){
    var transaction;
    assert.throws(function() {
      transaction = new postfinance.Transaction({
        operation: 'cancel',
        amount:10
      });
    });
    done()
  });

  it("New transaction has a few extra properties", function(done){
    var transaction = new postfinance.Transaction({
      operation: 'purchase',
      orderId:'abc',
      amount: 10
    });

    transaction.should.have.property('operation');
    transaction.operation.should.equal('purchase');
    transaction.should.have.property('data');
    done()
  });

  it.skip("Simple maintenance transactions do not set currency", function(done){
    var transaction = new postfinance.Transaction({
      operation: 'cancel',
      payId:'abc'
    });

    transaction.data.should.not.have.property('currency');
    transaction.data.should.not.have.property('operation');
    done()
  });

  it("Execute transaction with alias", function(done){
    this.timeout(10000)
    var transaction;

    
    transaction = new postfinance.Transaction({
      operation: 'purchase',
      amount:13400,
      orderId: 'TX'+Date.now(),
      email:'test@transaction.ch',
      groupId:'gp-6 apr. 2014'
    });

    // First we need a card
    var card = new postfinance.Card(testAlias);

    transaction.process(card, function(err){
      should.not.exist(err);
      done()        
    });


  });

  it.skip("Execute transaction with bad card", function(done){
    var transaction;

    function callback(err) {
      should.not.exist(err); // Failed transaction is not an error
      transaction.should.have.property('receipt');
      transaction.receipt.should.have.property('success');
      transaction.receipt.success.should.equal(false);
      transaction.should.have.property('messages');
      transaction.messages.should.have.property('errors');
      transaction.messages.errors.should.have.property('transaction');
      transaction.messages.errors.transaction.should.contain('Declined');
    }

    transaction = new postfinance.Transaction({
      operation: 'purchase',
      data: {
        billingReference: '123',
        customerReference: '123',
        amount: 10
      }
    });
    
    var card = new postfinance.Card(sandboxInvalidCard);

    card.createAlias(testAlias,function(err) {
      // We have the alias now.
      card.should.have.property('alias');
      transaction.process(card, callback);
    });

    done()
  });

  it.skip("Using transactions with wrong currency", function(done){
    var transaction;

    function callback(err) {
      should.exist(err);
      err.should.have.property('category');
      err.category.should.equal('system');
      err.should.have.property('message');
      err.message.should.equal('Currency not allowed');
      err.should.have.property('details');
      err.details.should.equal('GBP');
      transaction.should.not.have.property('receipt');
    }

    transaction = new postfinance.Transaction({
      operation: 'purchase',
      data: {
        amount: 10,
        currency: 'GBP'
      }
    });

    // First we need a card
    var card = new postfinance.Card(sandboxValidCard);

    card.createAlias(testAlias,function(err) {
      // We have the alias now.
      card.should.have.property('alias');
      transaction.process(card, callback);
    });
    done()
  });

  it.skip("Card with no alias cannot be used for transaction", function(done){
    var transaction;

    function callback(err) {
      should.exist(err);
      err.should.have.property('category');
      err.category.should.equal('system');
      err.should.have.property('message');
      err.message.should.equal('Card has no alias');
      transaction.should.not.have.property('receipt');
    }

    transaction = new postfinance.Transaction({
      operation: 'purchase',
      data: {
        amount: 10,
        currency: 'USD'
      }
    });

    var card = new postfinance.Card(sandboxValidCard);
    transaction.process(card, callback);
    done()
  });

});