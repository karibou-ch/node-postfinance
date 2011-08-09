/**
 * Daimyo - core Daimyo functionality
 * Copyright (c)2011, by Branko Vukelic <branko@herdhound.com>
 * Licensed under MIT license (see LICENSE)
 */

var settings = require('./config').settings;
var debug = require('./config').debug;
var check = require('./check');
var DaimyoError = require('./error');
var authpost = require('./authpost');
var tokenRe = /^[0-9a-f]{24}$/;
var daimyo = exports;

function normalizeYear(order, year) {
  return (Math.floor(new Date().getFullYear() / order) * order) + year;
}

/**
 * Creates a new payment method instance
 *
 * The payment method options can be either a single token:
 * - _token_: Payment method token
 *
 * or full credit card details:
 * - _number_: Credit card number
 * - _csc_: Card security code
 * - _year_: Expiration year
 * - _month_: Expiration month
 * - _firstName_: Card holder's first name
 * - _lastName_: Card holder's last name
 * - _address1_: Address line 1
 * - _address2_: Address line 2
 * - _city_: City
 * - _state_: State
 * - _zip_: Zip code
 *
 * If you supply both token, and card details, token will take presedence, and 
 * credit card details will be completely ignored.
 *
 * @param {Object} opts Payment method options
 * @constructor
 */
function Card(opts) {
  this.__defineSetter__('year', function(year) {
    if (!year) {
      return;
    }

    year = parseInt(year, 10);
    if (year < 10) {
      this._year = normalizeYear(10, year);
    } else if (year >= 10 && year < 100) {
      this._year = normalizeYear(100, year);
    } else {
      this._year = year;
    }
  });

  this.__defineGetter__('year', function() {
    return this._year;
  });

  this.__defineSetter__('month', function(month) {
    month = parseInt(month, 10);
    if (isNaN(month) || month < 1 || month > 12) {
      this._month = null;
    } else {
      this._month = month;
    }
  });

  this.__defineGetter__('month', function() {
    return this._month;
  });

  if (opts) {
    if (opts.token && tokenRe.test(opts.token)) {
      debug('Using payment token instead of credit card details.');
      this.token = opts.token;
    } else {
      debug('No valid token found. Using credit card details.');
      this.number = opts.number;
      this.csc = opts.csc;

      // Card number and CSC are required
      if (!this.number) {
        throw new Error('Card number is required');
      }
      if (!this.csc) {
        throw new Error('CSC is required');
      }

      this.year = opts.year || this.year;
      this.month = parseInt(opts.month, 10) || this.month;
      this.firstName = opts.firstName || this.firstName;
      this.lastName = opts.lastName || this.lastName;
      this.address1 = opts.address1 || this.address1;
      this.address2 = opts.address2 || this.address2;
      this.city = opts.city || this.city;
      this.state = opts.state || this.state;
      this.zip = opts.zip || this.zip;

      // Set card issuer
      this.issuer = check.getIssuer(this.number);
    }
  }
}

/**
 * Validate the card data
 *
 * Note that this only validates the correctness of the card number and CSC. 
 * The card may still fail to clear for any number of reasons.
 *
 * @returns {Boolean} Validation result
 */
Card.prototype.isValid = function() {
  if (!check.mod10check(this.number)) {
    return false;
  }

  if (!check.cscCheck(this.number, this.csc)) {
    return false;
  }

  return true;
};

/**
 * Checks the card expiration year/month
 *
 * If the year and month are not specified, the check will succeed.
 *
 * @returns {Boolean} Check result
 */
Card.prototype.isExpired = function() {
  var expYear = new Date().getFullYear();
  var expMonth = new Date().getMonth() + 1; // 0-indexed

  if (!this.year || !this.month) { return true; }

  // Expired card should not be last month this year or older
  if (this.year < expYear) { return true; }
  if (this.year === expYear && this.month < expMonth) { return true; }

  return false;
};

/**
 * Sends a request to create a new payment method
 *
 * Once the asynchronous request is done, it will call the callback with a 
 * single error object.
 *
 * @param {Function} Optional callback function (expects err)
 */
Card.prototype.create = function(callback) {
  var querystring = require('querystring');
  var self = this;
  var paymentTokenRe = /payment_method_token=([0-9a-f]{24})/;
  var msgRe = /<message[^>]*>([^<]*)<\/message>/;

  if (this.token) {
    callback(null, this.token);
    return;
  }

  // Reformat our data as required by the API
  paymentData = querystring.stringify({
    'redirect_url': 'http://example.com', // Bogus URL, required by API
    'merchant_key': settings.merchantKey,
    'credit_card[first_name]': this.firstName || '',
    'credit_card[last_name]': this.lastName || '',
    'credit_card[address_1]': this.address1 || '',
    'credit_card[address_2]': this.address2 || '',
    'credit_card[city]': this.city || '',
    'credit_card[state]': this.state || '',
    'credit_card[zip]': this.zip || '',
    'credit_card[card_type]':  this.issuer || '',
    'credit_card[card_number]': this.number || '',
    'credit_card[cvv]': this.csc || '',
    'credit_card[expiry_month]': this.month || '',
    'credit_card[expiry_year]': this.year || ''
  });

  authpost.makeRequest({
    method: 'POST',
    payload: paymentData
  }, function(err, res) {
    var errMsg;

    if (err && err instanceof DaimyoError) {
      callback(err);
    }
    if (err) {
      callback(new DaimyoError('system', 'Error making create payment method request', err));
      return;
    }
    if (res.status !== 302) {
      // Parse the body to find the error
      errMsg = msgRe.exec(res.body)[1];
      callback(new DaimyoError('system', 'Gateway responded with non-302 status', {status: res.status, message: errMsg}));
      return;
    }
    if (!res.headers.location) {
      callback(new DaimyoError('system', 'Gateway failed to send the location header', res.headers));
      return;
    }

    // Parse the location header to extract the token
    self.token = paymentTokenRe.exec(res.headers.location)[1];
    callback(null);
  });
 
};

daimyo.Card = Card;